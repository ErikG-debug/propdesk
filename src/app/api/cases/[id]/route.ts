import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CaseStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;

  const caseData = await prisma.case.findUnique({
    where: { id },
    include: {
      category: { include: { fields: { orderBy: { order: "asc" } } } },
      property: true,
      fieldValues: {
        include: { field: { select: { key: true, label: true, type: true } } },
        orderBy: { field: { order: "asc" } },
      },
      messages: { orderBy: { sentAt: "asc" } },
    },
  });

  if (!caseData) {
    return NextResponse.json({ error: "Ärende hittades inte" }, { status: 404 });
  }

  return NextResponse.json(caseData);
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const body = (await req.json()) as { status?: CaseStatus; note?: string };

  const allowedTransitions: Partial<Record<CaseStatus, CaseStatus[]>> = {
    READY_FOR_REVIEW: ["IN_PROGRESS", "CLOSED"],
    ESCALATED: ["IN_PROGRESS", "CLOSED"],
    IN_PROGRESS: ["CLOSED"],
    WAITING_FOR_RESIDENT: ["IN_PROGRESS", "CLOSED"],
  };

  const current = await prisma.case.findUnique({ where: { id }, select: { status: true } });
  if (!current) {
    return NextResponse.json({ error: "Ärende hittades inte" }, { status: 404 });
  }

  if (body.status) {
    const allowed = allowedTransitions[current.status] ?? [];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Kan inte byta från ${current.status} till ${body.status}` },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.case.update({
    where: { id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.note ? { escalationNote: body.note } : {}),
    },
  });

  return NextResponse.json(updated);
}
