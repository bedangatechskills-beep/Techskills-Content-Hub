import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ActivityLogRow,
  CampaignRow,
  CampusRow,
  CommentRow,
  ContentPillarRow,
  ContentRecordRow,
  ContentTypeRow,
  DifferentiatorRow,
  KanbanCardRow,
  ObjectiveRow,
  PlatformRow,
  ProfileRow,
  ProgramRow,
  RegionRow,
  StageDurationRow,
  TeamRow,
  WorkflowStatusRow,
} from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Reference data used by forms and filters
// ---------------------------------------------------------------------------
export interface ReferenceData {
  regions: RegionRow[];
  campuses: CampusRow[];
  programs: ProgramRow[];
  campaigns: CampaignRow[];
  platforms: PlatformRow[];
  objectives: ObjectiveRow[];
  pillars: ContentPillarRow[];
  differentiators: DifferentiatorRow[];
  contentTypes: ContentTypeRow[];
  statuses: WorkflowStatusRow[];
  teams: Pick<TeamRow, "id" | "key" | "name">[];
  people: Pick<ProfileRow, "id" | "full_name" | "account_status" | "role_id">[];
}

export async function getReferenceData(): Promise<ReferenceData> {
  const supabase = await createClient();
  const [
    regions,
    campuses,
    programs,
    campaigns,
    platforms,
    objectives,
    pillars,
    differentiators,
    contentTypes,
    statuses,
    teams,
    people,
  ] = await Promise.all([
    supabase.from("regions").select("*").order("code"),
    supabase.from("campuses").select("*").eq("is_active", true).order("name"),
    supabase.from("programs").select("*").eq("is_active", true).order("name"),
    supabase.from("campaigns").select("*").eq("is_active", true).order("name"),
    supabase.from("platforms").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("objectives").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("content_pillars").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("differentiators").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("content_types").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("workflow_statuses").select("*").order("sort_order"),
    supabase.from("teams").select("id, key, name").eq("is_active", true).order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, account_status, role_id")
      .eq("account_status", "active")
      .order("full_name"),
  ]);
  return {
    regions: regions.data ?? [],
    campuses: campuses.data ?? [],
    programs: programs.data ?? [],
    campaigns: campaigns.data ?? [],
    platforms: platforms.data ?? [],
    objectives: objectives.data ?? [],
    pillars: pillars.data ?? [],
    differentiators: differentiators.data ?? [],
    contentTypes: contentTypes.data ?? [],
    statuses: statuses.data ?? [],
    teams: teams.data ?? [],
    people: people.data ?? [],
  };
}

export async function getStatuses(): Promise<WorkflowStatusRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("workflow_statuses").select("*").order("sort_order");
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Content list / Kanban (both read v_kanban_cards)
// ---------------------------------------------------------------------------
export interface ContentFilters {
  status?: string;
  region?: string;
  program?: string;
  campaign?: string;
  owner?: string; // dm owner or assignee profile id
  priority?: string;
  due?: "overdue" | "week" | "none";
  q?: string;
  includeArchived?: boolean;
}

export async function listKanbanCards(filters: ContentFilters = {}): Promise<KanbanCardRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("v_kanban_cards")
    .select("*")
    .order("status_order")
    .order("priority", { ascending: false })
    .order("updated_at", { ascending: false });
  if (filters.status) q = q.eq("status_key", filters.status);
  if (filters.region) q = q.eq("region_code", filters.region);
  if (filters.program) q = q.eq("program_id", filters.program);
  if (filters.campaign) q = q.eq("campaign_id", filters.campaign);
  if (filters.priority)
    q = q.eq("priority", filters.priority as NonNullable<KanbanCardRow["priority"]>);
  if (filters.owner)
    q = q.or(`dm_owner_id.eq.${filters.owner},production_assignee_id.eq.${filters.owner}`);
  if (filters.due === "overdue") q = q.eq("is_overdue", true);
  if (filters.due === "week") {
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    q = q.lte("due_date", in7).gte("due_date", new Date().toISOString().slice(0, 10));
  }
  if (filters.q) q = q.or(`title.ilike.%${filters.q}%,content_id.ilike.%${filters.q}%`);
  if (!filters.includeArchived && !filters.status) q = q.neq("status_key", "archived");
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// One record
// ---------------------------------------------------------------------------
export interface ContentDetail {
  record: ContentRecordRow;
  card: KanbanCardRow | null;
  status: WorkflowStatusRow | null;
  platformIds: string[];
  differentiatorIds: string[];
  transitions: {
    to_status: string;
    to_name: string;
    reason_required: boolean;
    is_backward: boolean;
    label: string | null;
  }[];
}

export async function getContentByCode(code: string): Promise<ContentDetail | null> {
  const supabase = await createClient();
  const { data: record } = await supabase
    .from("content_records")
    .select("*")
    .eq("content_id", code)
    .maybeSingle();
  if (!record) return null;
  const [card, status, platforms, diffs, transitions] = await Promise.all([
    supabase.from("v_kanban_cards").select("*").eq("id", record.id).maybeSingle(),
    supabase.from("workflow_statuses").select("*").eq("key", record.status_key).maybeSingle(),
    supabase.from("content_platforms").select("platform_id").eq("content_id", record.id),
    supabase
      .from("content_differentiators")
      .select("differentiator_id")
      .eq("content_id", record.id),
    supabase.rpc("available_transitions", { p_content_id: record.id }),
  ]);
  return {
    record,
    card: card.data ?? null,
    status: status.data ?? null,
    platformIds: (platforms.data ?? []).map((p) => p.platform_id),
    differentiatorIds: (diffs.data ?? []).map((d) => d.differentiator_id),
    transitions: transitions.data ?? [],
  };
}

export interface ActivityEntry extends ActivityLogRow {
  actor_name: string | null;
}

export async function getActivity(contentId: string): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_log")
    .select("*")
    .eq("content_id", contentId)
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x))];
  const { data: people } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  return rows.map((r) => ({
    ...r,
    actor_name: r.actor_id ? (nameById.get(r.actor_id) ?? null) : null,
  }));
}

export interface CommentEntry extends CommentRow {
  author_name: string | null;
}

export async function getComments(contentId: string): Promise<CommentEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("*")
    .eq("content_id", contentId)
    .order("created_at");
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.author_id))];
  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  return rows.map((r) => ({ ...r, author_name: nameById.get(r.author_id) ?? null }));
}

export async function getStageHistory(contentId: string): Promise<StageDurationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_stage_durations")
    .select("*")
    .eq("content_id", contentId)
    .order("entered_at");
  return data ?? [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);
  return count ?? 0;
}
