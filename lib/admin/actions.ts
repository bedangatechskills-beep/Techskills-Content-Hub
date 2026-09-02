"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/access.server";
import { callAdminUsers } from "./edge";
import type { ActionState } from "@/lib/auth/actions";

const ROLE_KEY = z.string().regex(/^[a-z_]+$/);
const TEAM_KEY = z.string().regex(/^[a-z_]+$/);

function teamKeys(formData: FormData): string[] {
  return formData.getAll("team_keys").map(String).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
const inviteSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().email("Enter a valid e-mail address"),
  role_key: ROLE_KEY,
  job_title: z.string().trim().optional(),
  team_keys: z.array(TEAM_KEY),
});

export async function inviteUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requirePermission("admin.users");
  const parsed = inviteSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    role_key: formData.get("role_key"),
    job_title: formData.get("job_title") || undefined,
    team_keys: teamKeys(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await callAdminUsers({
    action: "invite",
    ...parsed.data,
    job_title: parsed.data.job_title ?? null,
  });
  if (result.error) return { error: result.error };
  if (!result.profile) return { error: "Unexpected response from the invitation service" };

  revalidatePath("/admin/users");
  redirect(
    `/admin/users/${result.profile.id}${result.warning ? "?warning=" + encodeURIComponent(result.warning) : ""}`,
  );
}

const updateSchema = z.object({
  profile_id: z.string().uuid(),
  full_name: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().email("Enter a valid e-mail address"),
  job_title: z.string().trim().optional(),
  role_key: ROLE_KEY,
  primary_team_key: TEAM_KEY.optional(),
  team_keys: z.array(TEAM_KEY),
});

export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requirePermission("admin.users");
  const parsed = updateSchema.safeParse({
    profile_id: formData.get("profile_id"),
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    job_title: formData.get("job_title") || undefined,
    role_key: formData.get("role_key"),
    primary_team_key: formData.get("primary_team_key") || undefined,
    team_keys: teamKeys(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_profile", {
    p_profile_id: parsed.data.profile_id,
    p_full_name: parsed.data.full_name,
    p_email: parsed.data.email,
    p_job_title: parsed.data.job_title,
    p_role_key: parsed.data.role_key,
    p_primary_team_key: parsed.data.primary_team_key,
    p_team_keys: parsed.data.team_keys,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${parsed.data.profile_id}`);
  return { success: "Profile saved" };
}

export type UserFlag = "final_approver" | "super_admin" | "can_verify_nepali";

export async function setUserFlag(
  profileId: string,
  flag: UserFlag,
  value: boolean,
): Promise<ActionState> {
  await requirePermission("admin.users");
  const supabase = await createClient();
  const rpc =
    flag === "final_approver"
      ? "admin_set_final_approver"
      : flag === "super_admin"
        ? "admin_set_super_admin"
        : "admin_set_can_verify_nepali";
  const { error } = await supabase.rpc(rpc, { p_profile_id: profileId, p_value: value });
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${profileId}`);
  return { success: "Updated" };
}

export type LifecycleAction = "disable" | "reactivate" | "resend_invite" | "send_reset";

export async function userLifecycle(
  profileId: string,
  action: LifecycleAction,
): Promise<ActionState> {
  await requirePermission("admin.users");
  const result = await callAdminUsers({ action, profile_id: profileId });
  if (result.error) return { error: result.error };
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${profileId}`);
  const messages: Record<LifecycleAction, string> = {
    disable: "User disabled. Their history is kept.",
    reactivate: "User reactivated.",
    resend_invite: "Invitation sent again.",
    send_reset: "Password reset e-mail sent.",
  };
  return { success: result.warning ?? messages[action] };
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------
const teamSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z_]+$/, "Key: lower-case letters and underscores only"),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
  supervisor_id: z.string().uuid().optional(),
  is_active: z.boolean(),
});

export async function upsertTeam(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requirePermission("admin.users");
  const parsed = teamSchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    supervisor_id: formData.get("supervisor_id") || undefined,
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_upsert_team", {
    p_key: parsed.data.key,
    p_name: parsed.data.name,
    p_description: parsed.data.description,
    p_supervisor_id: parsed.data.supervisor_id,
    p_is_active: parsed.data.is_active,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/teams");
  if (formData.get("redirect") === "detail") redirect(`/admin/teams/${data.id}`);
  return { success: "Team saved" };
}

export async function setTeamMembers(teamId: string, profileIds: string[]): Promise<ActionState> {
  await requirePermission("admin.users");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_team_members", {
    p_team_id: teamId,
    p_profile_ids: profileIds,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/admin/teams");
  return { success: "Members updated" };
}
