import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { name?: string; description?: string };

  const existing = await prisma.issueCategory.findUnique({ where: { id }, select: { companyId: true } });
  if (!existing || existing.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Kategori hittades inte" }, { status: 404 });
  }

  const category = await prisma.issueCategory.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      description: body.description?.trim() ?? null,
    },
    include: { fields: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(category);
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.issueCategory.findUnique({ where: { id }, select: { companyId: true } });
  if (!existing || existing.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Kategori hittades inte" }, { status: 404 });
  }

  const casesCount = await prisma.case.count({ where: { categoryId: id } });
  if (casesCount > 0) {
    return NextResponse.json(
      { error: "Kan inte ta bort kategori med befintliga ärenden" },
      { status: 409 }
    );
  }

  await prisma.issueCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
