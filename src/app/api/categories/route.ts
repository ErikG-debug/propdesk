import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const categories = await prisma.issueCategory.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { name: "asc" },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const body = (await req.json()) as { name: string; description?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Namn krävs" }, { status: 400 });
  }

  const category = await prisma.issueCategory.create({
    data: {
      companyId: session.user.companyId,
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
    },
    include: { fields: true },
  });

  return NextResponse.json(category, { status: 201 });
}
