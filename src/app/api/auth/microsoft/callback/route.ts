import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveMicrosoftTokens } from "@/lib/email";

// GET /api/auth/microsoft/callback?code=xxx&state=companyId
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login`);

  const code = req.nextUrl.searchParams.get("code");
  const companyId = req.nextUrl.searchParams.get("state");

  if (!code || !companyId) {
    return NextResponse.json({ error: "Saknar code eller state" }, { status: 400 });
  }

  if (companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Obehörig" }, { status: 403 });
  }

  try {
    const email = await saveMicrosoftTokens(companyId, code);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?microsoftConnected=${email}`
    );
  } catch (err) {
    console.error("Microsoft OAuth-fel:", err);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?error=microsoft_auth_failed`
    );
  }
}
