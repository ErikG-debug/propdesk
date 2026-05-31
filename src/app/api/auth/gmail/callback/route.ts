import { NextRequest, NextResponse } from "next/server";
import { saveGmailTokens } from "@/lib/gmail";

// GET /api/auth/gmail/callback?code=xxx&state=companyId
export async function GET(req: NextRequest): Promise<NextResponse> {
  const code = req.nextUrl.searchParams.get("code");
  const companyId = req.nextUrl.searchParams.get("state");

  if (!code || !companyId) {
    return NextResponse.json({ error: "Saknar code eller state" }, { status: 400 });
  }

  try {
    const email = await saveGmailTokens(companyId, code);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?gmailConnected=${email}`
    );
  } catch (err) {
    console.error("Gmail OAuth2-fel:", err);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?error=gmail_auth_failed`
    );
  }
}
