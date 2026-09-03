import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AiEvaluationRow,
  AiFlagResolutionRow,
  ScriptApprovalQueueRow,
  ScriptApprovalRow,
  ScriptVersionRow,
} from "@/lib/supabase/database.types";

export interface ScriptVersionEntry extends ScriptVersionRow {
  author_name: string | null;
  latest_evaluation: AiEvaluationRow | null;
}

export interface ScriptApprovalEntry extends ScriptApprovalRow {
  approver_name: string | null;
  version_no: number | null;
}

export interface EvaluationWithResolutions extends AiEvaluationRow {
  resolutions: (AiFlagResolutionRow & { actor_name: string | null })[];
  requester_name: string | null;
}

export interface ScriptTabData {
  versions: ScriptVersionEntry[];
  current: ScriptVersionEntry | null;
  approved: ScriptVersionEntry | null;
  evaluations: EvaluationWithResolutions[];
  approvals: ScriptApprovalEntry[];
  settings: { require_ai_before_submit: boolean; script_reapproval_required: boolean };
  /** A version newer than the approved one exists and has not been classified. */
  pendingMaterialAnswer: boolean;
  /** An AI check is queued for the current version (queue provider). */
  queued: boolean;
  /** Current version differs from the approved version (any classification). */
  changedAfterApproval: boolean;
}

async function nameMap(ids: (string | null | undefined)[]) {
  const supabase = await createClient();
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p.full_name]));
}

export async function getScriptTab(
  contentId: string,
  currentVersionId: string | null,
  approvedVersionId: string | null,
): Promise<ScriptTabData> {
  const supabase = await createClient();
  const [{ data: versions }, { data: evaluations }, { data: approvals }, { data: settings }] =
    await Promise.all([
      supabase
        .from("script_versions")
        .select("*")
        .eq("content_id", contentId)
        .order("version_no", { ascending: false }),
      supabase
        .from("ai_evaluations")
        .select("*")
        .eq("content_id", contentId)
        .eq("evaluation_type", "script")
        .order("created_at", { ascending: false }),
      supabase
        .from("script_approvals")
        .select("*")
        .eq("content_id", contentId)
        .order("created_at", { ascending: false }),
      supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["require_ai_before_submit", "script_reapproval_required"]),
    ]);
  const evalIds = (evaluations ?? []).map((e) => e.id);
  const { data: resolutions } = evalIds.length
    ? await supabase.from("ai_flag_resolutions").select("*").in("evaluation_id", evalIds)
    : { data: [] as AiFlagResolutionRow[] };

  const names = await nameMap([
    ...(versions ?? []).map((v) => v.created_by),
    ...(approvals ?? []).map((a) => a.approver_id),
    ...(evaluations ?? []).map((e) => e.requested_by),
    ...(resolutions ?? []).map((r) => r.actor_id),
  ]);

  const latestByVersion = new Map<string, AiEvaluationRow>();
  for (const e of evaluations ?? []) {
    if (e.script_version_id && !latestByVersion.has(e.script_version_id))
      latestByVersion.set(e.script_version_id, e);
  }
  const versionEntries: ScriptVersionEntry[] = (versions ?? []).map((v) => ({
    ...v,
    author_name: v.created_by ? (names.get(v.created_by) ?? null) : null,
    latest_evaluation: latestByVersion.get(v.id) ?? null,
  }));
  const byId = new Map(versionEntries.map((v) => [v.id, v]));
  const current = currentVersionId ? (byId.get(currentVersionId) ?? null) : null;
  const approved = approvedVersionId ? (byId.get(approvedVersionId) ?? null) : null;
  const versionNo = new Map(versionEntries.map((v) => [v.id, v.version_no]));

  const { data: pendingReq } = currentVersionId
    ? await supabase.rpc("pending_ai_request", { p_script_version_id: currentVersionId })
    : { data: null };
  const settingsMap = new Map((settings ?? []).map((s) => [s.key, s.value]));
  const bool = (k: string, d: boolean) =>
    typeof settingsMap.get(k) === "boolean" ? (settingsMap.get(k) as boolean) : d;

  return {
    versions: versionEntries,
    current,
    approved,
    evaluations: (evaluations ?? []).map((e) => ({
      ...e,
      requester_name: e.requested_by ? (names.get(e.requested_by) ?? null) : null,
      resolutions: (resolutions ?? [])
        .filter((r) => r.evaluation_id === e.id)
        .map((r) => ({ ...r, actor_name: names.get(r.actor_id) ?? null })),
    })),
    approvals: (approvals ?? []).map((a) => ({
      ...a,
      approver_name: names.get(a.approver_id) ?? null,
      version_no: versionNo.get(a.script_version_id) ?? null,
    })),
    settings: {
      require_ai_before_submit: bool("require_ai_before_submit", true),
      script_reapproval_required: bool("script_reapproval_required", true),
    },
    queued: !!(pendingReq as { id?: string } | null)?.id,
    pendingMaterialAnswer:
      !!current && !!approved && current.id !== approved.id && current.is_material_change === null,
    changedAfterApproval: !!current && !!approved && current.id !== approved.id,
  };
}

export async function getScriptApprovalQueue(): Promise<ScriptApprovalQueueRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_script_approval_queue")
    .select("*")
    .order("waiting_since", { ascending: true });
  return data ?? [];
}
