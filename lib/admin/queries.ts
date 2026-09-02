import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow, RoleRow, TeamRow } from "@/lib/supabase/database.types";

export interface UserListRow extends ProfileRow {
  role: Pick<RoleRow, "key" | "name"> | null;
  teams: Pick<TeamRow, "id" | "key" | "name">[];
}

export async function listUsers(): Promise<UserListRow[]> {
  const supabase = await createClient();
  const [{ data: profiles }, { data: roles }, { data: teams }, { data: memberships }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .neq("account_status", "archived_demo")
        .order("full_name"),
      supabase.from("roles").select("id, key, name"),
      supabase.from("teams").select("id, key, name"),
      supabase.from("team_memberships").select("team_id, profile_id"),
    ]);
  const roleById = new Map((roles ?? []).map((r) => [r.id, r]));
  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));
  return (profiles ?? []).map((p) => ({
    ...p,
    role: p.role_id ? (roleById.get(p.role_id) ?? null) : null,
    teams: (memberships ?? [])
      .filter((m) => m.profile_id === p.id)
      .map((m) => teamById.get(m.team_id))
      .filter((t): t is Pick<TeamRow, "id" | "key" | "name"> => !!t),
  }));
}

export async function getUser(id: string): Promise<UserListRow | null> {
  const users = await listUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function listRoles(): Promise<RoleRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("roles").select("*").order("name");
  return data ?? [];
}

export interface TeamWithMembers extends TeamRow {
  supervisor: Pick<ProfileRow, "id" | "full_name"> | null;
  members: Pick<ProfileRow, "id" | "full_name" | "email" | "account_status" | "job_title">[];
}

export async function listTeams(): Promise<TeamWithMembers[]> {
  const supabase = await createClient();
  const [{ data: teams }, { data: profiles }, { data: memberships }] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, email, account_status, job_title")
      .order("full_name"),
    supabase.from("team_memberships").select("team_id, profile_id"),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  return (teams ?? []).map((t) => ({
    ...t,
    supervisor: t.supervisor_id ? (profileById.get(t.supervisor_id) ?? null) : null,
    members: (memberships ?? [])
      .filter((m) => m.team_id === t.id)
      .map((m) => profileById.get(m.profile_id))
      .filter((p): p is NonNullable<typeof p> => !!p),
  }));
}

export async function getTeam(id: string): Promise<TeamWithMembers | null> {
  const teams = await listTeams();
  return teams.find((t) => t.id === id) ?? null;
}

export async function listProfileOptions(): Promise<
  Pick<ProfileRow, "id" | "full_name" | "email" | "account_status">[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, account_status")
    .neq("account_status", "archived_demo")
    .order("full_name");
  return data ?? [];
}
