import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const body = (await req.json()) as { name?: string; description?: string };

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
  const { id } = await params;

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
