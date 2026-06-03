import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const account = await prisma.emailAccount.findUnique({
    where: { companyId: session.user.companyId },
    select: { email: true, provider: true, expiresAt: true },
  });

  return NextResponse.json(account);
}
