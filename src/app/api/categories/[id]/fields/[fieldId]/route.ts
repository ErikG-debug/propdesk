import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; fieldId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { fieldId } = await params;

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
  const { fieldId } = await params;
  const body = (await req.json()) as {
    label?: string;
    required?: boolean;
    options?: string[];
  };

  const field = await prisma.categoryField.update({
    where: { id: fieldId },
    data: {
      ...(body.label ? { label: body.label.trim() } : {}),
      ...(body.required !== undefined ? { required: body.required } : {}),
      ...(body.options ? { options: body.options } : {}),
    },
  });

  return NextResponse.json(field);
}
