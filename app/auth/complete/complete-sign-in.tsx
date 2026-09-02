"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Finishes an implicit-flow auth link. The browser client reads the
 * `#access_token` fragment on start-up (detectSessionInUrl), stores the
 * session in cookies, and fires SIGNED_IN; we then move on to `next`.
 */
export function CompleteSignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    const nextParam = params.get("next") ?? "/";
    const next = nextParam.startsWith("/") ? nextParam : "/";

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashError = hash.get("error_description") ?? hash.get("error");
    if (hashError) {
      router.replace(`/auth/error?message=${encodeURIComponent(hashError)}`);
      return;
    }

    const supabase = createClient();
    let done = false;
    // Hard navigation: the server must see the new cookie on the next request,
    // and it discards the token fragment from history.
    const go = () => {
      if (done) return;
      done = true;
      window.location.replace(next);
    };

    // Admin-generated links use the implicit flow; the client is configured
    // for PKCE and ignores that fragment, so set the session explicitly.
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            router.replace(`/auth/error?message=${encodeURIComponent(error.message)}`);
            return;
          }
          go();
        });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session &&
        (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "PASSWORD_RECOVERY")
      )
        go();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });

    const timer = setTimeout(() => {
      if (!done) {
        setStatus("This link could not be used.");
        router.replace(
          "/auth/error?message=" +
            encodeURIComponent("The link is invalid, expired, or was already used."),
        );
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [params, router]);

  return (
    <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {status}
    </p>
  );
}
