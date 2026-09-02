import type { ProfileRow, RoleRow } from "@/lib/supabase/database.types";

/** Result of the my_access() RPC: everything §6 loads after login. */
export interface Access {
  profile: ProfileRow;
  role: RoleRow | null;
  permissions: string[];
  teams: { id: string; key: string; name: string }[];
}

export type PermissionKey =
  | "content.create"
  | "content.edit_concept"
  | "content.view_all"
  | "script.edit"
  | "script.submit"
  | "script.approve"
  | "production.assign"
  | "production.review"
  | "production.update_own"
  | "dm.review"
  | "review.rate"
  | "review.override_threshold"
  | "final.approve"
  | "publish.schedule"
  | "publish.publish"
  | "admin.users"
  | "admin.reference_data";

/** Mirrors public.has_permission(): role permission, or super admin for admin.*. */
export function can(access: Access | null, key: PermissionKey): boolean {
  if (!access || access.profile.account_status !== "active") return false;
  if (access.permissions.includes(key)) return true;
  return key.startsWith("admin.") && access.profile.is_super_admin;
}

export function isFinalApprover(access: Access | null): boolean {
  return !!access && access.profile.account_status === "active" && access.profile.is_final_approver;
}

export function inTeam(access: Access | null, teamKey: string): boolean {
  return !!access && access.teams.some((t) => t.key === teamKey);
}

export function parseAccess(raw: unknown): Access | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Access>;
  if (!r.profile) return null;
  return {
    profile: r.profile,
    role: r.role ?? null,
    permissions: Array.isArray(r.permissions) ? r.permissions : [],
    teams: Array.isArray(r.teams) ? r.teams : [],
  };
}
