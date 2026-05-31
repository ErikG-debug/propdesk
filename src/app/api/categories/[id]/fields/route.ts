import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { FieldType } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id: categoryId } = await params;
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
