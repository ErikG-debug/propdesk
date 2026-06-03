import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { CaseStatus } from "@prisma/client";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const { companyId, id: userId } = session.user;
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") as CaseStatus | null;
  const assigned = searchParams.get("assigned");

  const cases = await prisma.case.findMany({
    where: {
      companyId,
      ...(status ? { status } : {}),
      ...(assigned === "me" ? { assignedToId: userId } : {}),
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
