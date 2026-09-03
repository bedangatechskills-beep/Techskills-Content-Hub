"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth/access.server";
import type { ActionState } from "@/lib/auth/actions";
import type { AiEvaluationRow, FlagAction } from "@/lib/supabase/database.types";

function revalidateRecord(code: string) {
  revalidatePath(`/content/${code}`);
  revalidatePath("/content");
  revalidatePath("/board");
  revalidatePath("/approvals/scripts");
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------
const versionSchema = z.object({
  content_id: z.string().uuid(),
  content_code: z.string().min(1),
  body: z.string().trim().min(1, "Write the script first"),
  change_summary: z.string().trim().optional(),
});

export async function createScriptVersion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActiveUser();
  const parsed = versionSchema.safeParse({
    content_id: formData.get("content_id"),
    content_code: formData.get("content_code"),
    body: formData.get("body"),
    change_summary: formData.get("change_summary") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_script_version", {
    p_content_id: parsed.data.content_id,
    p_body: parsed.data.body,
    p_change_summary: parsed.data.change_summary,
  });
  if (error) return { error: error.message };
  revalidateRecord(parsed.data.content_code);
  return { success: `Saved as V${data.version_no}` };
}

export async function markVersionMaterial(
  versionId: string,
  contentCode: string,
  isMaterial: boolean,
  reason: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_version_material", {
    p_version_id: versionId,
    p_is_material: isMaterial,
    p_reason: reason,
  });
  if (error) return { error: error.message };
  revalidateRecord(contentCode);
  return {
    success: isMaterial
      ? "Marked material. Sent back for re-approval."
      : "Marked as a non-material change.",
  };
}

// ---------------------------------------------------------------------------
// AI check — the Edge Function does the work; this is a thin, authenticated pipe.
// ---------------------------------------------------------------------------
export async function runAiScriptCheck(
  versionId: string,
  contentCode: string,
  force = false,
): Promise<ActionState & { evaluation?: AiEvaluationRow; reused?: boolean }> {
  await requireActiveUser();
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{
    evaluation?: AiEvaluationRow;
    reused?: boolean;
    queued?: boolean;
    error?: string;
  }>("evaluate-script", { body: { script_version_id: versionId, force } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = (await ctx.json()) as { error?: string };
        return { error: parsed.error ?? error.message };
      } catch {
        /* fall through */
      }
    }
    return { error: error.message };
  }
  if (data?.error) return { error: data.error };
  revalidateRecord(contentCode);
  if (data?.queued) {
    return {
      success:
        "Queued for evaluation. The reviewer session picks it up within a few minutes; refresh to see the result.",
    };
  }
  return {
    success: data?.reused
      ? "Unchanged since the last check — showing the stored result."
      : "AI check complete.",
    evaluation: data?.evaluation,
    reused: data?.reused,
  };
}

export async function resolveAiFlag(
  evaluationId: string,
  flagIndex: number,
  action: FlagAction,
  reason: string | undefined,
  contentCode: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_ai_flag", {
    p_evaluation_id: evaluationId,
    p_flag_index: flagIndex,
    p_action: action,
    p_reason: reason?.trim() || undefined,
  });
  if (error) return { error: error.message };
  revalidateRecord(contentCode);
  return { success: action === "resolved" ? "Flag resolved" : "Flag dismissed" };
}

// ---------------------------------------------------------------------------
// Submission and approval
// ---------------------------------------------------------------------------
export async function submitScriptForApproval(
  versionId: string,
  contentCode: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_script_for_approval", { p_version_id: versionId });
  if (error) return { error: error.message };
  revalidateRecord(contentCode);
  return { success: "Submitted for script approval" };
}

export async function approveScript(versionId: string, contentCode: string): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_script", { p_version_id: versionId });
  if (error) return { error: error.message };
  revalidateRecord(contentCode);
  return { success: "Script approved" };
}

export async function requestScriptChanges(
  versionId: string,
  contentCode: string,
  reason: string,
): Promise<ActionState> {
  await requireActiveUser();
  if (!reason.trim()) return { error: "A reason is required" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_script_changes", {
    p_version_id: versionId,
    p_reason: reason.trim(),
  });
  if (error) return { error: error.message };
  revalidateRecord(contentCode);
  return { success: "Changes requested" };
}

export async function verifyNepali(
  contentId: string,
  contentCode: string,
  note?: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_nepali", {
    p_content_id: contentId,
    p_note: note?.trim() || undefined,
  });
  if (error) return { error: error.message };
  revalidateRecord(contentCode);
  return { success: "Nepali text verified" };
}
