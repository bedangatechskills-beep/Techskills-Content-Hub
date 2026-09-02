import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, parseAccess, type Access, type PermissionKey } from "@/lib/permissions/access";

/**
 * Loads the caller's profile, role, permissions and teams in one RPC (§6).
 * Cached per request so the layout and pages share a single call.
 */
export const getAccess = cache(async (): Promise<Access | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc("my_access");
  if (error) return null;
  return parseAccess(data);
});

/** Active session with an active profile, or redirect. */
export async function requireActiveUser(): Promise<Access> {
  const access = await getAccess();
  if (!access) redirect("/login");
  if (access.profile.account_status !== "active") redirect("/account-inactive");
  return access;
}

/** Permission check at the data layer, not only in the menu (§106). */
export async function requirePermission(key: PermissionKey): Promise<Access> {
  const access = await requireActiveUser();
  if (!can(access, key)) redirect("/403");
  return access;
}
