import { NextRequest, NextResponse } from "next/server";
import { getGmailAuthUrl, saveGmailTokens } from "@/lib/gmail";

// GET /api/auth/gmail?companyId=xxx — startar OAuth2-flödet
export async function GET(req: NextRequest): Promise<NextResponse> {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId saknas" }, { status: 400 });
  }
  const url = getGmailAuthUrl(companyId);
  return NextResponse.redirect(url);
}
