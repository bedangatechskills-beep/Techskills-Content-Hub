"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth/access.server";
import type { ActionState } from "@/lib/auth/actions";
import type { Json, ReviewerDecision } from "@/lib/supabase/database.types";
import type { ChangeItemInput } from "@/lib/review/actions";

function revalidateRecord(code?: string) {
  if (code) revalidatePath(`/content/${code}`);
  revalidatePath("/content");
  revalidatePath("/board");
  revalidatePath("/reviews/content");
  revalidatePath("/approvals/final");
  revalidatePath("/me");
}

export async function setContentReviewRequired(
  contentId: string,
  code: string,
  required: boolean,
  minResponses?: number,
  reason?: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_content_review_required", {
    p_content_id: contentId,
    p_required: required,
    p_min_responses: minResponses,
    p_reason: reason?.trim() || undefined,
  });
  if (error) return { error: error.message };
  revalidateRecord(code);
  return { success: required ? "Content Review turned on" : "Content Review turned off" };
}

export async function submitReviewerRating(
  contentId: string,
  code: string,
  scores: Record<string, number>,
  decision: ReviewerDecision,
  comment?: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_reviewer_rating", {
    p_content_id: contentId,
    p_scores: scores as Json,
    p_decision: decision,
    p_comment: comment?.trim() || undefined,
  });
  if (error) return { error: error.message };
  revalidateRecord(code);
  return { success: "Rating submitted" };
}

export async function recordDmOverride(
  contentId: string,
  code: string,
  reason: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_dm_override", {
    p_content_id: contentId,
    p_reason: reason.trim(),
  });
  if (error) return { error: error.message };
  revalidateRecord(code);
  return { success: "Override recorded. The CEO will see it on the final approval screen." };
}

export async function completeContentReview(
  contentId: string,
  code: string,
  skipReason?: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_content_review", {
    p_content_id: contentId,
    p_skip_reason: skipReason?.trim() || undefined,
  });
  if (error) return { error: error.message };
  revalidateRecord(code);
  return { success: "Moved to Ready for Final Approval" };
}

export async function submitForFinalApproval(
  contentId: string,
  code: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_for_final_approval", { p_content_id: contentId });
  if (error) return { error: error.message };
  revalidateRecord(code);
  return { success: "Submitted for final approval" };
}

export async function finalApprove(
  contentId: string,
  code: string,
  overrideReason?: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("final_approve", {
    p_content_id: contentId,
    p_override_reason: overrideReason?.trim() || undefined,
  });
  if (error) return { error: error.message };
  revalidateRecord(code);
  return { success: "Final approved" };
}

export async function finalRequestChanges(
  contentId: string,
  code: string,
  reason: string,
  items: ChangeItemInput[] = [],
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("final_request_changes", {
    p_content_id: contentId,
    p_reason: reason.trim(),
    p_items: items.filter((i) => i.description.trim()) as unknown as Json,
  });
  if (error) return { error: error.message };
  revalidateRecord(code);
  return { success: "Changes requested" };
}

export async function finalReject(
  contentId: string,
  code: string,
  reason: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("final_reject", {
    p_content_id: contentId,
    p_reason: reason.trim(),
  });
  if (error) return { error: error.message };
  revalidateRecord(code);
  return { success: "Rejected and archived" };
}

export async function markCreativeMaterial(
  creativeVersionId: string,
  code: string,
  isMaterial: boolean,
  reason: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_creative_material", {
    p_creative_version_id: creativeVersionId,
    p_is_material: isMaterial,
    p_reason: reason.trim(),
  });
  if (error) return { error: error.message };
  revalidateRecord(code);
  return {
    success: isMaterial
      ? "Marked material. Sent back for CEO re-approval."
      : "Marked non-material. The approval carries over.",
  };
}
