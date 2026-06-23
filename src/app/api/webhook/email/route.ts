import { NextRequest, NextResponse } from "next/server";
import { processInboundEmail } from "@/lib/email-processor";
import type { InboundEmail } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

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
  } catch (err) {
    // Logga men returnera 200 — Postmark försöker annars om vid 5xx och vi
    // riskerar att ärendet skapas och svar skickas flera gånger.
    console.error("Fel vid bearbetning av inkommande mail:", err);
  }
  return NextResponse.json({ ok: true });
}
