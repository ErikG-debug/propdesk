import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  const properties = await prisma.property.findMany({
    select: { name: true, address: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(properties);
}
