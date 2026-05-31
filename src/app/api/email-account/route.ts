import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_COMPANY_ID = process.env.DEMO_COMPANY_ID ?? "";

export async function GET(): Promise<NextResponse> {
  if (!DEMO_COMPANY_ID) return NextResponse.json(null);

  const account = await prisma.emailAccount.findUnique({
    where: { companyId: DEMO_COMPANY_ID },
    select: { email: true, provider: true, expiresAt: true },
  });

  return NextResponse.json(account);
}
