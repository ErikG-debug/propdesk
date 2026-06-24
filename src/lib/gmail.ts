import { google } from "googleapis";
import { prisma } from "./prisma";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
);

export function getGmailAuthUrl(companyId: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state: companyId,
    prompt: "consent",
  });
}

export async function saveGmailTokens(
  companyId: string,
  code: string
): Promise<string> {
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Ofullständiga OAuth2-tokens från Google");
  }

  oauth2Client.setCredentials(tokens);

  const userInfo = await google
    .oauth2({ version: "v2", auth: oauth2Client })
    .userinfo.get();

  const email = userInfo.data.email!;

  await prisma.emailAccount.upsert({
    where: { companyId },
    create: {
      companyId,
      email,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
    },
    update: {
      email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
    },
  });

  return email;
}

async function getAuthorizedClient(companyId: string) {
  const account = await prisma.emailAccount.findUnique({
    where: { companyId },
  });
  if (!account) throw new Error(`Inget Gmail-konto kopplat för bolag ${companyId}`);

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });

  // Förnya token om den snart löper ut
  if (account.expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    const { credentials } = await auth.refreshAccessToken();
    await prisma.emailAccount.update({
      where: { companyId },
      data: {
        accessToken: credentials.access_token!,
        ...(credentials.refresh_token ? { refreshToken: credentials.refresh_token } : {}),
        expiresAt: new Date(credentials.expiry_date ?? Date.now() + 3600 * 1000),
      },
    });
    auth.setCredentials(credentials);
  }

  return { auth, email: account.email };
}

function buildMimeMessage({
  from,
  to,
  subject,
  body,
  inReplyTo,
  references,
}: {
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}): string {
  // Koda subject med RFC 2047 base64 för att hantera svenska tecken
  const encodedSubject = `=?utf-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;

  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
  ];
  const wrap = (id: string) => (id.startsWith("<") ? id : `<${id}>`);
  if (inReplyTo) lines.push(`In-Reply-To: ${wrap(inReplyTo)}`);
  if (references) lines.push(`References: ${references.split(" ").map(wrap).join(" ")}`);
  lines.push("", Buffer.from(body, "utf-8").toString("base64"));
  return lines.join("\r\n");
}

export async function sendEmailAsPropertyManager({
  companyId,
  to,
  subject,
  body,
  inReplyTo,
  references,
}: {
  companyId: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}): Promise<string> {
  const { auth, email: fromEmail } = await getAuthorizedClient(companyId);
  const gmail = google.gmail({ version: "v1", auth });

  const raw = Buffer.from(
    buildMimeMessage({ from: fromEmail, to, subject, body, inReplyTo, references })
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return result.data.id ?? "";
}
