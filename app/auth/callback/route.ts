import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for every Supabase e-mail link (invite, recovery). Exchanges
 * the PKCE code for a session, then continues to `next` (/invite or
 * /reset-password), which are session-only routes in the middleware.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") ? nextParam : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const err = searchParams.get("error_description") ?? "The link is invalid or has expired.";
  return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(err)}`);
}
