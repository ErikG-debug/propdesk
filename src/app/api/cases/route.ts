import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CaseStatus } from "@prisma/client";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status") as CaseStatus | null;

  if (!companyId) {
    return NextResponse.json({ error: "companyId saknas" }, { status: 400 });
  }

  const cases = await prisma.case.findMany({
    where: {
      companyId,
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      category: { select: { id: true, name: true } },
      property: { select: { id: true, name: true } },
      fieldValues: {
        include: { field: { select: { key: true, label: true } } },
      },
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json(cases);
}
