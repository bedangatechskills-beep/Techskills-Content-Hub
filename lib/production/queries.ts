import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AssignmentRow,
  CeoStatsRow,
  CreativeVersionRow,
  DmStatsRow,
  KanbanCardRow,
  ProductionReviewRow,
  ProductionTaskRow,
  ProfileRow,
  UnassignedWorkRow,
  WorkloadRow,
} from "@/lib/supabase/database.types";

export const SIGNED_URL_TTL = 60 * 30; // 30 minutes

async function nameMap(ids: (string | null | undefined)[]) {
  const supabase = await createClient();
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p.full_name]));
}

// ---------------------------------------------------------------------------
// Record → Production tab
// ---------------------------------------------------------------------------
export interface TaskEntry extends ProductionTaskRow {
  assignee_name: string | null;
}
export interface CreativeEntry extends CreativeVersionRow {
  uploader_name: string | null;
  /** Short-lived signed URL for preview/download (private bucket). */
  signed_url: string | null;
}
export interface ProductionReviewEntry extends ProductionReviewRow {
  reviewer_name: string | null;
  creative_version_no: number | null;
}
export interface AssignmentEntry extends AssignmentRow {
  assignee_name: string | null;
  assigned_by_name: string | null;
}
export interface ProductionTabData {
  tasks: TaskEntry[];
  creatives: CreativeEntry[];
  current: CreativeEntry | null;
  reviews: ProductionReviewEntry[];
  assignments: AssignmentEntry[];
  checklist: string[];
  people: Pick<ProfileRow, "id" | "full_name">[];
}

export async function getProductionTab(
  contentId: string,
  currentCreativeId: string | null,
): Promise<ProductionTabData> {
  const supabase = await createClient();
  const [
    { data: tasks },
    { data: creatives },
    { data: reviews },
    { data: assignments },
    { data: setting },
    { data: people },
  ] = await Promise.all([
    supabase
      .from("production_tasks")
      .select("*")
      .eq("content_id", contentId)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("creative_versions")
      .select("*")
      .eq("content_id", contentId)
      .order("version_no", { ascending: false }),
    supabase
      .from("production_reviews")
      .select("*")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("assignments")
      .select("*")
      .eq("content_id", contentId)
      .order("assigned_at", { ascending: false }),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "production_review_checklist")
      .maybeSingle(),
    supabase
      .from("v_workload")
      .select("profile_id, full_name")
      .eq("in_production", true)
      .order("full_name"),
  ]);

  const names = await nameMap([
    ...(tasks ?? []).map((t) => t.assignee_id),
    ...(creatives ?? []).map((c) => c.uploaded_by),
    ...(reviews ?? []).map((r) => r.reviewer_id),
    ...(assignments ?? []).flatMap((a) => [a.assignee_id, a.assigned_by]),
  ]);

  const paths = (creatives ?? []).map((c) => c.storage_path);
  const signed = paths.length
    ? await supabase.storage.from("creatives").createSignedUrls(paths, SIGNED_URL_TTL)
    : { data: [] };
  const urlByPath = new Map((signed.data ?? []).map((s) => [s.path ?? "", s.signedUrl]));

  const creativeEntries: CreativeEntry[] = (creatives ?? []).map((c) => ({
    ...c,
    uploader_name: c.uploaded_by ? (names.get(c.uploaded_by) ?? null) : null,
    signed_url: urlByPath.get(c.storage_path) ?? null,
  }));
  const versionNo = new Map(creativeEntries.map((c) => [c.id, c.version_no]));

  return {
    tasks: (tasks ?? []).map((t) => ({
      ...t,
      assignee_name: t.assignee_id ? (names.get(t.assignee_id) ?? null) : null,
    })),
    creatives: creativeEntries,
    current: currentCreativeId
      ? (creativeEntries.find((c) => c.id === currentCreativeId) ?? null)
      : null,
    reviews: (reviews ?? []).map((r) => ({
      ...r,
      reviewer_name: names.get(r.reviewer_id) ?? null,
      creative_version_no: r.creative_version_id
        ? (versionNo.get(r.creative_version_id) ?? null)
        : null,
    })),
    assignments: (assignments ?? []).map((a) => ({
      ...a,
      assignee_name: a.assignee_id ? (names.get(a.assignee_id) ?? null) : null,
      assigned_by_name: a.assigned_by ? (names.get(a.assigned_by) ?? null) : null,
    })),
    checklist: Array.isArray(setting?.value) ? (setting!.value as string[]) : [],
    people: (people ?? [])
      .map((p) => ({ id: p.profile_id ?? "", full_name: p.full_name ?? "" }))
      .filter((p) => p.id),
  };
}

// ---------------------------------------------------------------------------
// Team Board (§73 order: Production, Unassigned, DM, CEO)
// ---------------------------------------------------------------------------
export interface TeamBoardData {
  production: WorkloadRow[];
  unassigned: UnassignedWorkRow[];
  dm: (WorkloadRow & { stats: DmStatsRow | null })[];
  ceo: (WorkloadRow & { stats: CeoStatsRow | null })[];
}

export function sortProduction(rows: WorkloadRow[]): WorkloadRow[] {
  // §75–76: active desc, overdue desc, stalled desc, name asc. Role never matters.
  return [...rows].sort(
    (a, b) =>
      (b.active_count ?? 0) - (a.active_count ?? 0) ||
      (b.overdue_count ?? 0) - (a.overdue_count ?? 0) ||
      (b.stalled_count ?? 0) - (a.stalled_count ?? 0) ||
      (a.full_name ?? "").localeCompare(b.full_name ?? ""),
  );
}

export async function getTeamBoard(): Promise<TeamBoardData> {
  const supabase = await createClient();
  const [{ data: workload }, { data: unassigned }, { data: dmStats }, { data: ceoStats }] =
    await Promise.all([
      supabase.from("v_workload").select("*"),
      supabase
        .from("v_unassigned_work")
        .select("*")
        .order("is_overdue", { ascending: false })
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("v_dm_stats").select("*"),
      supabase.from("v_ceo_stats").select("*"),
    ]);
  const rows = workload ?? [];
  const dmById = new Map((dmStats ?? []).map((s) => [s.profile_id, s]));
  const ceoById = new Map((ceoStats ?? []).map((s) => [s.profile_id, s]));
  return {
    production: sortProduction(rows.filter((r) => r.in_production)),
    unassigned: unassigned ?? [],
    // Dual DM/Reviewer members appear once here with badges (§81)
    dm: rows
      .filter((r) => r.in_dm || (r.in_content_reviewer && !r.in_production && !r.in_ceo))
      .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""))
      .map((r) => ({ ...r, stats: dmById.get(r.profile_id ?? "") ?? null })),
    ceo: rows
      .filter((r) => r.in_ceo)
      .map((r) => ({ ...r, stats: ceoById.get(r.profile_id ?? "") ?? null })),
  };
}

// ---------------------------------------------------------------------------
// Person backlog (D5)
// ---------------------------------------------------------------------------
export interface BacklogItem extends Partial<KanbanCardRow> {
  item_kind?: "content" | "task";
  task_title?: string | null;
  task_id?: string | null;
}
export interface BacklogChange {
  content_id: string;
  content_code: string;
  title: string;
  reason: string | null;
  created_at: string;
  is_resolved: boolean;
}
export interface BacklogDone {
  content_id: string;
  content_code: string;
  event_type: string;
  description: string;
  created_at: string;
}
export interface PersonBacklog {
  profile: Pick<ProfileRow, "id" | "full_name" | "work_status" | "photo_url" | "job_title"> & {
    role_name: string | null;
    teams: string[];
  };
  workload: WorkloadRow | null;
  waiting_on_me: BacklogItem[];
  assigned_to_me: BacklogItem[];
  changes_i_asked_for: BacklogChange[];
  blocked_by_others: BacklogItem[];
  recently_done: BacklogDone[];
}

export async function getPersonBacklog(profileId: string): Promise<PersonBacklog | null> {
  const supabase = await createClient();
  const [{ data: profile }, { data: backlog, error }, { data: memberships }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, work_status, photo_url, job_title, role_id")
      .eq("id", profileId)
      .maybeSingle(),
    supabase.rpc("person_backlog", { p_profile_id: profileId }),
    supabase.from("team_memberships").select("team_id, teams(name)").eq("profile_id", profileId),
  ]);
  if (!profile || error) return null;
  const { data: role } = profile.role_id
    ? await supabase.from("roles").select("name").eq("id", profile.role_id).maybeSingle()
    : { data: null };
  const b = (backlog ?? {}) as Record<string, unknown>;
  const teams = (memberships ?? [])
    .map((m) => (m.teams as { name?: string } | null)?.name)
    .filter((x): x is string => !!x);
  return {
    profile: { ...profile, role_name: role?.name ?? null, teams },
    workload: (b.workload as WorkloadRow | null) ?? null,
    waiting_on_me: (b.waiting_on_me as BacklogItem[]) ?? [],
    assigned_to_me: (b.assigned_to_me as BacklogItem[]) ?? [],
    changes_i_asked_for: (b.changes_i_asked_for as BacklogChange[]) ?? [],
    blocked_by_others: (b.blocked_by_others as BacklogItem[]) ?? [],
    recently_done: (b.recently_done as BacklogDone[]) ?? [],
  };
}

export async function listPeople(): Promise<Pick<ProfileRow, "id" | "full_name">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("account_status", "active")
    .order("full_name");
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Production Manager overview (/production)
// ---------------------------------------------------------------------------
export interface ProductionOverview {
  unassigned: UnassignedWorkRow[];
  inProgress: KanbanCardRow[];
  overdue: KanbanCardRow[];
  awaitingReview: KanbanCardRow[];
  changesRequired: KanbanCardRow[];
}

export async function getProductionOverview(): Promise<ProductionOverview> {
  const supabase = await createClient();
  const [{ data: unassigned }, { data: cards }] = await Promise.all([
    supabase.from("v_unassigned_work").select("*").order("is_overdue", { ascending: false }),
    supabase
      .from("v_kanban_cards")
      .select("*")
      .in("status_key", [
        "ready_for_production",
        "production",
        "production_review",
        "changes_required",
      ]),
  ]);
  const all = cards ?? [];
  return {
    unassigned: unassigned ?? [],
    inProgress: all.filter((c) => c.status_key === "production"),
    overdue: all.filter((c) => c.is_overdue),
    awaitingReview: all.filter((c) => c.status_key === "production_review"),
    changesRequired: all.filter((c) => c.status_key === "changes_required"),
  };
}
