import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  FinalApprovalRow,
  OverrideRow,
  ReviewerRatingRow,
} from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";

export type ContentReviewQueueRow = Database["public"]["Views"]["v_content_review_queue"]["Row"];
export type FinalApprovalQueueRow = Database["public"]["Views"]["v_final_approval_queue"]["Row"];

export interface ChecklistItem {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
  link: "script" | "production" | "reviews";
  overridable?: boolean;
}
export interface ReviewerSummary {
  required: boolean;
  quorum: number;
  threshold: number;
  count: number;
  average: number | null;
  against: number;
  meets_quorum: boolean;
  meets_threshold: boolean;
  override: {
    id: string;
    kind: string;
    reason: string;
    actor_id: string;
    created_at: string;
  } | null;
  ratings: {
    id: string;
    reviewer_id: string;
    reviewer_name: string;
    average: number;
    decision: string;
    comment: string | null;
    scores: Record<string, number>;
    created_at: string;
  }[];
}
export interface Checklist {
  items: ChecklistItem[];
  all_ok: boolean;
  blocking_ok: boolean;
  overridable_failures: string[];
  reviewer_summary: ReviewerSummary;
  computed_at: string;
}

export interface OverrideEntry extends OverrideRow {
  actor_name: string | null;
}
export interface FinalApprovalEntry extends FinalApprovalRow {
  approver_name: string | null;
  script_version_no: number | null;
  creative_version_no: number | null;
}
export interface FinalTabData {
  checklist: Checklist | null;
  summary: ReviewerSummary | null;
  ratings: (ReviewerRatingRow & { reviewer_name: string | null })[];
  overrides: OverrideEntry[];
  finalApprovals: FinalApprovalEntry[];
  categories: string[];
  /** A creative newer than the final-approved one exists and is unclassified. */
  pendingCreativeMaterial: boolean;
  creativeChangedAfterApproval: boolean;
}

async function nameMap(ids: (string | null | undefined)[]) {
  const supabase = await createClient();
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p.full_name]));
}

export async function getChecklist(contentId: string): Promise<Checklist | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("final_approval_checklist", { p_content_id: contentId });
  return (data as unknown as Checklist | null) ?? null;
}

export async function getFinalTab(
  contentId: string,
  currentCreativeId: string | null,
  approvedCreativeId: string | null,
): Promise<FinalTabData> {
  const supabase = await createClient();
  const [
    { data: checklist },
    { data: ratings },
    { data: overrides },
    { data: finals },
    { data: cats },
    { data: cvs },
    { data: svs },
    { data: current },
  ] = await Promise.all([
    supabase.rpc("final_approval_checklist", { p_content_id: contentId }),
    supabase
      .from("reviewer_ratings")
      .select("*")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("overrides")
      .select("*")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("final_approvals")
      .select("*")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false }),
    supabase.from("app_settings").select("value").eq("key", "reviewer_categories").maybeSingle(),
    supabase.from("creative_versions").select("id, version_no").eq("content_id", contentId),
    supabase.from("script_versions").select("id, version_no").eq("content_id", contentId),
    currentCreativeId
      ? supabase
          .from("creative_versions")
          .select("is_material_change")
          .eq("id", currentCreativeId)
          .maybeSingle()
      : Promise.resolve({ data: null as { is_material_change: boolean | null } | null }),
  ]);
  const names = await nameMap([
    ...(ratings ?? []).map((r) => r.reviewer_id),
    ...(overrides ?? []).map((o) => o.actor_id),
    ...(finals ?? []).map((f) => f.approver_id),
  ]);
  const cvNo = new Map((cvs ?? []).map((c) => [c.id, c.version_no]));
  const svNo = new Map((svs ?? []).map((s) => [s.id, s.version_no]));
  const cl = (checklist as unknown as Checklist | null) ?? null;
  const hasApproval = (finals ?? []).some((f) => f.decision === "approved");
  const changed = hasApproval && !!currentCreativeId && currentCreativeId !== approvedCreativeId;
  return {
    checklist: cl,
    summary: cl?.reviewer_summary ?? null,
    ratings: (ratings ?? []).map((r) => ({
      ...r,
      reviewer_name: names.get(r.reviewer_id) ?? null,
    })),
    overrides: (overrides ?? []).map((o) => ({ ...o, actor_name: names.get(o.actor_id) ?? null })),
    finalApprovals: (finals ?? []).map((f) => ({
      ...f,
      approver_name: names.get(f.approver_id) ?? null,
      script_version_no: f.script_version_id ? (svNo.get(f.script_version_id) ?? null) : null,
      creative_version_no: f.creative_version_id ? (cvNo.get(f.creative_version_id) ?? null) : null,
    })),
    categories: Array.isArray(cats?.value) ? (cats!.value as string[]) : [],
    pendingCreativeMaterial: changed && current?.is_material_change == null,
    creativeChangedAfterApproval: changed,
  };
}

export async function getContentReviewQueue(): Promise<ContentReviewQueueRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_content_review_queue")
    .select("*")
    .order("is_overdue", { ascending: false })
    .order("stage_entered_at");
  return data ?? [];
}

export async function getFinalApprovalQueue(): Promise<FinalApprovalQueueRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_final_approval_queue")
    .select("*")
    .order("is_overdue", { ascending: false })
    .order("stage_entered_at");
  return data ?? [];
}
