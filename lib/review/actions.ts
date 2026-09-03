"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth/access.server";
import type { ActionState } from "@/lib/auth/actions";
import type {
  AiEvaluationRow,
  ChangeCategory,
  DmDecision,
  Json,
} from "@/lib/supabase/database.types";

function revalidateRecord(code?: string) {
  if (code) revalidatePath(`/content/${code}`);
  revalidatePath("/content");
  revalidatePath("/board");
  revalidatePath("/reviews/dm");
  revalidatePath("/team");
  revalidatePath("/me");
}

async function invokeEdge<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data?: T; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(name, { body });
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
  return { data: data as T };
}

// ---------------------------------------------------------------------------
// AI creative check
// ---------------------------------------------------------------------------
export async function runAiCreativeCheck(
  creativeVersionId: string,
  code: string,
  opts: { force?: boolean; source?: "manual" | "auto" } = {},
): Promise<ActionState & { evaluation?: AiEvaluationRow; reused?: boolean }> {
  await requireActiveUser();
  const r = await invokeEdge<{ evaluation?: AiEvaluationRow; reused?: boolean; queued?: boolean }>(
    "evaluate-creative",
    {
      creative_version_id: creativeVersionId,
      force: !!opts.force,
      source: opts.source ?? "manual",
    },
  );
  if (r.error) return { error: r.error };
  revalidateRecord(code);
  if (r.data?.queued) {
    return {
      success:
        "Queued for evaluation. The reviewer session picks it up within a few minutes; refresh to see the result.",
    };
  }
  return {
    success: r.data?.reused
      ? "Unchanged since the last check — showing the stored result."
      : "AI creative check complete.",
    evaluation: r.data?.evaluation,
    reused: r.data?.reused,
  };
}

/** Fire-and-forget auto run (S9). Errors are swallowed; the UI still offers a manual run. */
export async function autoRunCreativeCheck(creativeVersionId: string, code: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "rerun_on_new_creative")
      .maybeSingle();
    if (setting?.value === false) return;
    await runAiCreativeCheck(creativeVersionId, code, { source: "auto" });
  } catch {
    /* advisory only */
  }
}

// ---------------------------------------------------------------------------
// DM / Brand Review
// ---------------------------------------------------------------------------
export interface ChangeItemInput {
  description: string;
  category: ChangeCategory;
  assigned_user_id?: string;
}

export async function dmReview(
  contentId: string,
  code: string,
  decision: DmDecision,
  feedback: string | undefined,
  items: ChangeItemInput[],
  checklist: Record<string, boolean>,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("dm_review", {
    p_content_id: contentId,
    p_decision: decision,
    p_feedback: feedback?.trim() || undefined,
    p_items: items.filter((i) => i.description.trim()) as unknown as Json,
    p_checklist: checklist as Json,
  });
  if (error) return { error: error.message };
  revalidateRecord(code);
  return { success: decision === "approved" ? "DM review approved" : "Changes requested" };
}

export async function resolveChangeRequest(
  requestId: string,
  code: string,
  note?: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_change_request", {
    p_request_id: requestId,
    p_note: note?.trim() || undefined,
  });
  if (error) return { error: error.message };
  revalidateRecord(code);
  return { success: "Change request resolved" };
}

export async function reopenChangeRequest(
  requestId: string,
  code: string,
  reason: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_change_request", {
    p_request_id: requestId,
    p_reason: reason.trim(),
  });
  if (error) return { error: error.message };
  revalidateRecord(code);
  return { success: "Change request reopened" };
}

export async function routeChangesRequired(
  contentId: string,
  code: string,
  target?: "production" | "script_copy",
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("route_changes_required", {
    p_content_id: contentId,
    p_target: target,
  });
  if (error) return { error: error.message };
  revalidateRecord(code);
  return {
    success: target === "script_copy" ? "Sent back to Script / Copy" : "Sent back to Production",
  };
}
