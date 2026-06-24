import { NextRequest, NextResponse } from "next/server";
import { processInboundEmail } from "@/lib/email-processor";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { firstName, lastName, email, phone, address, company, shortDescription, longDescription, faultType } = body;

  if (!email?.trim() || !shortDescription?.trim() || !firstName?.trim()) {
    return NextResponse.json({ error: "Fyll i alla obligatoriska fält." }, { status: 400 });
  }

  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  const from = `${name} <${email.trim()}>`;

  const parts = [shortDescription.trim()];
  if (longDescription?.trim()) parts.push(`\n${longDescription.trim()}`);
  if (faultType) parts.push(`Typ av fel: ${faultType}`);
  if (address) parts.push(`Adress: ${address}`);
  if (company) parts.push(`Hyresgäst/Företag: ${company}`);
  if (phone) parts.push(`Telefon: ${phone}`);

  const textBody = parts.join("\n");
  const messageId = `<webform-${Date.now()}-${Math.random().toString(36).slice(2)}@bodesk.se>`;

  await processInboundEmail({
    from,
    to: "webform@bodesk.internal",
    subject: shortDescription.trim(),
    textBody,
    messageId,
  });

  return NextResponse.json({ ok: true });
}
