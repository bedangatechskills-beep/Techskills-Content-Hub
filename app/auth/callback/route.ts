import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for every Supabase e-mail link (invite, recovery).
 *
 * Two shapes arrive here:
 *  - `?code=...` (PKCE): exchanged server-side for a session cookie.
 *  - `#access_token=...` (implicit, used by links generated through the admin
 *    API such as invitations): the fragment never reaches the server, so we
 *    hand off to a client page that reads it. Browsers keep the fragment
 *    across this redirect.
 * Then continue to `next` (/invite or /reset-password), which are
 * session-only routes in the middleware.
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
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`,
    );
  }

  const errDesc = searchParams.get("error_description");
  if (errDesc) {
    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(errDesc)}`);
  }

  return NextResponse.redirect(`${origin}/auth/complete?next=${encodeURIComponent(next)}`);
}
