import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string; fieldId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const { id: categoryId, fieldId } = await params;

  const field = await prisma.categoryField.findUnique({
    where: { id: fieldId },
    include: { category: { select: { companyId: true } } },
  });
  if (!field || field.categoryId !== categoryId || field.category.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Fält hittades inte" }, { status: 404 });
  }

  const usageCount = await prisma.caseFieldValue.count({ where: { fieldId } });
  if (usageCount > 0) {
    return NextResponse.json(
      { error: "Fältet används i befintliga ärenden och kan inte tas bort" },
      { status: 409 }
    );
  }

  await prisma.categoryField.delete({ where: { id: fieldId } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const { id: categoryId, fieldId } = await params;

  const field = await prisma.categoryField.findUnique({
    where: { id: fieldId },
    include: { category: { select: { companyId: true } } },
  });
  if (!field || field.categoryId !== categoryId || field.category.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Fält hittades inte" }, { status: 404 });
  }

  const body = (await req.json()) as {
    label?: string;
    required?: boolean;
    options?: string[];
  };

  const updated = await prisma.categoryField.update({
    where: { id: fieldId },
    data: {
      ...(body.label ? { label: body.label.trim() } : {}),
      ...(body.required !== undefined ? { required: body.required } : {}),
      ...(body.options ? { options: body.options } : {}),
    },
  });

  return NextResponse.json(updated);
}
