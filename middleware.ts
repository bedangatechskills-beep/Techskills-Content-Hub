import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/auth/callback",
  "/auth/complete",
  "/auth/error",
];
// Reachable with a session but without an active profile (password setup).
const SESSION_ONLY_PATHS = ["/reset-password", "/invite", "/account-inactive"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { supabase, getResponse } = createMiddlewareClient(request);
  const { pathname } = request.nextUrl;

  // Refreshes the session cookie; never remove this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (startsWithAny(pathname, PUBLIC_PATHS)) {
    if (user && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return getResponse();
  }

  if (!user) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (startsWithAny(pathname, SESSION_ONLY_PATHS)) {
    return getResponse();
  }

  // Disabled or pending accounts hold a session but may not use the app.
  const { data: active } = await supabase.rpc("is_active_user");
  if (!active) {
    return NextResponse.redirect(new URL("/account-inactive", request.url));
  }

  return getResponse();
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
