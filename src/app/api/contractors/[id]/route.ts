import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const { id } = await params;

  const contractor = await prisma.contractor.findUnique({ where: { id } });
  if (!contractor || contractor.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Hittades inte" }, { status: 404 });
  }

  await prisma.contractor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
