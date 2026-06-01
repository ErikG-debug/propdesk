import { NextRequest, NextResponse } from "next/server";
import { processInboundEmail } from "@/lib/email-processor";
import type { InboundEmail } from "@/types";
import crypto from "crypto";

// Postmark skickar ett X-Postmark-Signature header som vi verifierar
function verifyPostmarkWebhook(body: string, signature: string): boolean {
  const secret = process.env.POSTMARK_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-postmark-signature") ?? "";

  if (process.env.NODE_ENV === "production" && !verifyPostmarkWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Ogiltig signatur" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Ogiltigt JSON" }, { status: 400 });
  }

  const headers = (payload.Headers as { Name: string; Value: string }[]) ?? [];
  const headerMap = Object.fromEntries(headers.map((h) => [h.Name.toLowerCase(), h.Value]));

  // Postmarks MessageID är deras eget ID — det riktiga Gmail Message-ID finns i Headers
  const realMessageId =
    headerMap["message-id"] ??
    headerMap["x-forwarded-message-id"] ??
    (payload.MessageID as string) ??
    "";

  const email: InboundEmail = {
    from: (payload.From as string) ?? "",
    to: ((payload.To as string) ?? "").toLowerCase(),
    subject: (payload.Subject as string) ?? "(inget ämne)",
    textBody: (payload.TextBody as string) ?? "",
    htmlBody: (payload.HtmlBody as string | undefined),
    messageId: realMessageId,
    inReplyTo: (payload.InReplyTo as string | undefined),
  };

  if (!email.from || !email.to) {
    return NextResponse.json({ error: "Saknar From eller To" }, { status: 400 });
  }

  try {
    await processInboundEmail(email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Fel vid bearbetning av inkommande mail:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
