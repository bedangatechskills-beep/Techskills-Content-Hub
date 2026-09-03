import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AiEvaluationRow,
  AiFlagResolutionRow,
  ChangeRequestRow,
  DmReviewQueueRow,
  DmReviewRow,
} from "@/lib/supabase/database.types";

export interface GateStatus {
  has_creative: boolean;
  has_creative_evaluation: boolean;
  evaluation_id: string | null;
  verdict: string | null;
  open_hard_flags: Array<
    Record<string, unknown> & {
      index: number;
      key: string;
      severity: string;
      excerpt: string;
      fix: string;
      needs_human: boolean;
    }
  >;
  open_hard_flag_count: number;
  nepali_pending: boolean;
  requires_ai_disclosure: boolean;
  open_change_requests: number;
  open_tasks: number;
  has_folder: boolean;
  script_approved: boolean;
}

export interface CreativeEvaluationEntry extends AiEvaluationRow {
  requester_name: string | null;
  resolutions: (AiFlagResolutionRow & { actor_name: string | null })[];
}
export interface ChangeRequestEntry extends ChangeRequestRow {
  requested_by_name: string | null;
  assigned_user_name: string | null;
  resolved_by_name: string | null;
  assigned_team_name: string | null;
}
export interface DmReviewEntry extends DmReviewRow {
  reviewer_name: string | null;
  creative_version_no: number | null;
}

export interface ReviewsTabData {
  gate: GateStatus | null;
  evaluations: CreativeEvaluationEntry[];
  /** Latest evaluation on the current creative version, if any. */
  latest: CreativeEvaluationEntry | null;
  dmReviews: DmReviewEntry[];
  changeRequests: ChangeRequestEntry[];
  checklist: string[];
}

async function nameMap(ids: (string | null | undefined)[]) {
  const supabase = await createClient();
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p.full_name]));
}

export async function getGateStatus(contentId: string): Promise<GateStatus | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("gate_status", { p_content_id: contentId });
  return (data as unknown as GateStatus | null) ?? null;
}

export async function getReviewsTab(
  contentId: string,
  currentCreativeId: string | null,
): Promise<ReviewsTabData> {
  const supabase = await createClient();
  const [
    { data: gate },
    { data: evaluations },
    { data: dmReviews },
    { data: changes },
    { data: setting },
    { data: cvs },
  ] = await Promise.all([
    supabase.rpc("gate_status", { p_content_id: contentId }),
    supabase
      .from("ai_evaluations")
      .select("*")
      .eq("content_id", contentId)
      .eq("evaluation_type", "creative")
      .order("created_at", { ascending: false }),
    supabase
      .from("dm_reviews")
      .select("*")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("change_requests")
      .select("*")
      .eq("content_id", contentId)
      .order("is_resolved")
      .order("created_at", { ascending: false }),
    supabase.from("app_settings").select("value").eq("key", "dm_review_checklist").maybeSingle(),
    supabase.from("creative_versions").select("id, version_no").eq("content_id", contentId),
  ]);
  const evalIds = (evaluations ?? []).map((e) => e.id);
  const { data: resolutions } = evalIds.length
    ? await supabase.from("ai_flag_resolutions").select("*").in("evaluation_id", evalIds)
    : { data: [] as AiFlagResolutionRow[] };
  const teamIds = [
    ...new Set((changes ?? []).map((c) => c.assigned_team_id).filter((x): x is string => !!x)),
  ];
  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name").in("id", teamIds)
    : { data: [] as { id: string; name: string }[] };
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const names = await nameMap([
    ...(evaluations ?? []).map((e) => e.requested_by),
    ...(resolutions ?? []).map((r) => r.actor_id),
    ...(dmReviews ?? []).map((r) => r.reviewer_id),
    ...(changes ?? []).flatMap((c) => [c.requested_by, c.assigned_user_id, c.resolved_by]),
  ]);
  const versionNo = new Map((cvs ?? []).map((c) => [c.id, c.version_no]));

  const evalEntries: CreativeEvaluationEntry[] = (evaluations ?? []).map((e) => ({
    ...e,
    requester_name: e.requested_by ? (names.get(e.requested_by) ?? null) : null,
    resolutions: (resolutions ?? [])
      .filter((r) => r.evaluation_id === e.id)
      .map((r) => ({ ...r, actor_name: names.get(r.actor_id) ?? null })),
  }));

  return {
    gate: (gate as unknown as GateStatus | null) ?? null,
    evaluations: evalEntries,
    latest: currentCreativeId
      ? (evalEntries.find((e) => e.creative_version_id === currentCreativeId) ?? null)
      : null,
    dmReviews: (dmReviews ?? []).map((r) => ({
      ...r,
      reviewer_name: names.get(r.reviewer_id) ?? null,
      creative_version_no: r.creative_version_id
        ? (versionNo.get(r.creative_version_id) ?? null)
        : null,
    })),
    changeRequests: (changes ?? []).map((c) => ({
      ...c,
      requested_by_name: names.get(c.requested_by) ?? null,
      assigned_user_name: c.assigned_user_id ? (names.get(c.assigned_user_id) ?? null) : null,
      resolved_by_name: c.resolved_by ? (names.get(c.resolved_by) ?? null) : null,
      assigned_team_name: c.assigned_team_id ? (teamName.get(c.assigned_team_id) ?? null) : null,
    })),
    checklist: Array.isArray(setting?.value) ? (setting!.value as string[]) : [],
  };
}

export async function getDmReviewQueue(): Promise<DmReviewQueueRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_dm_review_queue")
    .select("*")
    .order("is_overdue", { ascending: false })
    .order("stage_entered_at", { ascending: true });
  return data ?? [];
}
