import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { FieldType } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const { id: categoryId } = await params;

  const category = await prisma.issueCategory.findUnique({ where: { id: categoryId }, select: { companyId: true } });
  if (!category || category.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Kategori hittades inte" }, { status: 404 });
  }

  const body = (await req.json()) as {
    key: string;
    label: string;
    type?: FieldType;
    required?: boolean;
    options?: string[];
  };

  if (!body.key?.trim() || !body.label?.trim()) {
    return NextResponse.json({ error: "key och label krävs" }, { status: 400 });
  }

  const existingCount = await prisma.categoryField.count({ where: { categoryId } });

  const field = await prisma.categoryField.create({
    data: {
      categoryId,
      key: body.key.trim().toLowerCase().replace(/\s+/g, "_"),
      label: body.label.trim(),
      type: body.type ?? "TEXT",
      required: body.required ?? true,
      options: body.options ?? [],
      order: existingCount,
    },
  });

  return NextResponse.json(field, { status: 201 });
}
