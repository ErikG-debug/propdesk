import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const contractors = await prisma.contractor.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(contractors);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const { name, email, phone, role } = await req.json();
  if (!name?.trim() || !email?.trim() || !role?.trim()) {
    return NextResponse.json({ error: "Namn, e-post och roll krävs" }, { status: 400 });
  }

  const contractor = await prisma.contractor.create({
    data: {
      companyId: session.user.companyId,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      role: role.trim(),
    },
  });

  return NextResponse.json(contractor, { status: 201 });
}
