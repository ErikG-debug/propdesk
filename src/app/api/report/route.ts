import { NextRequest, NextResponse } from "next/server";
import { processInboundEmail } from "@/lib/email-processor";
import { prisma } from "@/lib/prisma";

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

  // Välj det bolag vars Gmail-konto senast uppdaterades (undviker testbolag med ogiltiga tokens)
  const latestAccount = await prisma.emailAccount.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { companyId: true },
  });

  try {
    await processInboundEmail({
      from,
      to: "webform@bodesk.internal",
      subject: shortDescription.trim(),
      textBody,
      messageId,
    }, latestAccount?.companyId);
  } catch (err) {
    console.error("Fel vid processInboundEmail från webformulär:", err);
    return NextResponse.json({ error: "Något gick fel. Försök igen senare." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
