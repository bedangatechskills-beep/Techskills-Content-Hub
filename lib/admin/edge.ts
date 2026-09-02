import "server-only";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import type { ProfileRow } from "@/lib/supabase/database.types";

export type AdminUsersAction = "invite" | "resend_invite" | "send_reset" | "disable" | "reactivate";

export interface AdminUsersResult {
  profile?: ProfileRow;
  ok?: boolean;
  warning?: string;
  error?: string;
}

/**
 * Calls the admin-users Edge Function with the caller's session. The function
 * re-runs permission checks through the database RPCs, so this is a thin pipe.
 */
export async function callAdminUsers(
  body: { action: AdminUsersAction } & Record<string, unknown>,
): Promise<AdminUsersResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<AdminUsersResult>("admin-users", {
    body: { ...body, redirectBase: publicEnv.NEXT_PUBLIC_APP_URL },
  });

  if (error) {
    // FunctionsHttpError carries the JSON body from the function.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = (await ctx.json()) as AdminUsersResult;
        return { error: parsed.error ?? error.message };
      } catch {
        /* fall through */
      }
    }
    return { error: error.message };
  }
  return data ?? {};
}
