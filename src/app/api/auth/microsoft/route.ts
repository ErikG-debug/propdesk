import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMicrosoftAuthUrl } from "@/lib/email";

// GET /api/auth/microsoft — startar OAuth2-flödet mot Microsoft
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const url = getMicrosoftAuthUrl(session.user.companyId);
  return NextResponse.redirect(url);
}
