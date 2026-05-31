import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_COMPANY_ID = process.env.DEMO_COMPANY_ID ?? "";

export async function GET(): Promise<NextResponse> {
  const categories = await prisma.issueCategory.findMany({
    where: { companyId: DEMO_COMPANY_ID },
    orderBy: { name: "asc" },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as { name: string; description?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Namn krävs" }, { status: 400 });
  }

  const category = await prisma.issueCategory.create({
    data: {
      companyId: DEMO_COMPANY_ID,
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
    },
    include: { fields: true },
  });

  return NextResponse.json(category, { status: 201 });
}
