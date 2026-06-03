import { google } from "googleapis";
import { prisma } from "./prisma";

// ─── Google / Gmail ────────────────────────────────────────────────────────

const googleOAuth2 = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
);

export function getGmailAuthUrl(companyId: string): string {
  return googleOAuth2.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state: companyId,
    prompt: "consent",
  });
}

export async function saveGmailTokens(companyId: string, code: string): Promise<string> {
  const { tokens } = await googleOAuth2.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Ofullständiga OAuth2-tokens från Google");
  }

  googleOAuth2.setCredentials(tokens);
  const userInfo = await google.oauth2({ version: "v2", auth: googleOAuth2 }).userinfo.get();
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
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
    },
  });

  return email;
}

async function getAuthorizedGmailClient(companyId: string) {
  const account = await prisma.emailAccount.findUnique({ where: { companyId } });
  if (!account) throw new Error(`Inget e-postkonto kopplat för bolag ${companyId}`);

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  });

  if (account.expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    const { credentials } = await auth.refreshAccessToken();
    await prisma.emailAccount.update({
      where: { companyId },
      data: {
        accessToken: credentials.access_token!,
        expiresAt: new Date(credentials.expiry_date ?? Date.now() + 3600 * 1000),
      },
    });
    auth.setCredentials(credentials);
  }

  return { auth, email: account.email };
}

function buildMimeMessage({
  from, to, subject, body, inReplyTo, references,
}: {
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}): string {
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

async function sendViaGmail(params: SendEmailParams): Promise<string> {
  const { auth, email: fromEmail } = await getAuthorizedGmailClient(params.companyId);
  const gmail = google.gmail({ version: "v1", auth });

  const raw = Buffer.from(
    buildMimeMessage({ from: fromEmail, to: params.to, subject: params.subject, body: params.body, inReplyTo: params.inReplyTo, references: params.references })
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const result = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
  return result.data.id ?? "";
}

// ─── Microsoft / Outlook ──────────────────────────────────────────────────

export function getMicrosoftAuthUrl(companyId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/microsoft/callback`,
    response_mode: "query",
    scope: "https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access",
    state: companyId,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

export async function saveMicrosoftTokens(companyId: string, code: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    code,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/microsoft/callback`,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenRes.ok) throw new Error("Microsoft token-utbyte misslyckades");

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) throw new Error("Kunde inte hämta Microsoft-användarinfo");

  const user = (await userRes.json()) as { mail?: string; userPrincipalName?: string };
  const email = user.mail ?? user.userPrincipalName ?? "";

  await prisma.emailAccount.upsert({
    where: { companyId },
    create: {
      companyId,
      email,
      provider: "microsoft",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
    update: {
      email,
      provider: "microsoft",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return email;
}

async function refreshMicrosoftToken(companyId: string): Promise<string> {
  const account = await prisma.emailAccount.findUnique({ where: { companyId } });
  if (!account) throw new Error("Inget Microsoft-konto kopplat");

  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    refresh_token: account.refreshToken,
    grant_type: "refresh_token",
    scope: "https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read offline_access",
  });

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error("Microsoft token-förnyelse misslyckades");

  const tokens = (await res.json()) as { access_token: string; expires_in: number };

  await prisma.emailAccount.update({
    where: { companyId },
    data: {
      accessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return tokens.access_token;
}

async function sendViaMicrosoft(params: SendEmailParams): Promise<string> {
  const account = await prisma.emailAccount.findUnique({ where: { companyId: params.companyId } });
  if (!account) throw new Error("Inget Microsoft-konto kopplat");

  let accessToken = account.accessToken;
  if (account.expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    accessToken = await refreshMicrosoftToken(params.companyId);
  }

  const message = {
    message: {
      subject: params.subject,
      body: { contentType: "Text", content: params.body },
      toRecipients: [{ emailAddress: { address: params.to } }],
      ...(params.inReplyTo ? { internetMessageHeaders: [{ name: "In-Reply-To", value: params.inReplyTo }] } : {}),
    },
  };

  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!res.ok) throw new Error("Microsoft Graph sendMail misslyckades");
  return "";
}

// ─── Gemensamt utskicksgränssnitt ─────────────────────────────────────────

interface SendEmailParams {
  companyId: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<string> {
  const account = await prisma.emailAccount.findUnique({
    where: { companyId: params.companyId },
    select: { provider: true },
  });
  if (!account) throw new Error(`Inget e-postkonto kopplat för bolag ${params.companyId}`);

  if (account.provider === "microsoft") {
    return sendViaMicrosoft(params);
  }
  return sendViaGmail(params);
}

// Bakåtkompatibelt alias för befintliga anrop
export const sendEmailAsPropertyManager = sendEmail;
