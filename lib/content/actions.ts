"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth/access.server";
import type { ActionState } from "@/lib/auth/actions";
import type { CommentSection, ContentRecordRow, Json } from "@/lib/supabase/database.types";

const uuid = z.string().uuid();
const optionalUuid = z.preprocess((v) => (v === "" || v == null ? undefined : v), uuid.optional());
const optionalText = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().optional());
const optionalDate = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

function all(fd: FormData, key: string): string[] {
  return fd.getAll(key).map(String).filter(Boolean);
}

/** Friendly wording for the database's error codes. */
function friendly(message: string, code?: string): string {
  if (code === "42501") return message.replace(/^.*permission required$/, "You do not have permission for this action.");
  return message;
}

// ---------------------------------------------------------------------------
// Create (Requested / Planned intake, §17)
// ---------------------------------------------------------------------------
const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: optionalText,
  request_type: optionalText,
  requesting_team_key: optionalText,
  program_id: optionalUuid,
  campaign_id: optionalUuid,
  region_code: z.enum(["AU", "NP"], { message: "Choose a region" }),
  campus_id: optionalUuid,
  content_type_id: uuid.or(z.literal("")).refine((v) => v !== "", { message: "Choose a content type (One-off if nothing fits)" }),
  objective_id: optionalUuid,
  secondary_objective_id: optionalUuid,
  pillar_id: optionalUuid,
  target_audience: optionalText,
  hook: optionalText,
  concept: optionalText,
  core_message: optionalText,
  audience_takeaway: optionalText,
  cta: optionalText,
  creative_direction: optionalText,
  reference_notes: optionalText,
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  target_publish_date: optionalDate,
  script_due: optionalDate,
  production_due: optionalDate,
  review_due: optionalDate,
  requires_ai_disclosure: z.boolean(),
  content_review_required: z.boolean(),
  platform_ids: z.array(uuid),
  differentiator_ids: z.array(uuid),
});

export async function createContent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireActiveUser();
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) if (!k.endsWith("_ids")) raw[k] = v;
  raw.platform_ids = all(formData, "platform_ids");
  raw.differentiator_ids = all(formData, "differentiator_ids");
  raw.requires_ai_disclosure = formData.get("requires_ai_disclosure") === "on";
  raw.content_review_required = formData.get("content_review_required") === "on";

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_content_record", { p: parsed.data });
  if (error) return { error: friendly(error.message, error.code) };

  revalidatePath("/content");
  revalidatePath("/board");
  redirect(`/content/${(data as ContentRecordRow).content_id}`);
}

// ---------------------------------------------------------------------------
// Stage moves — the database decides; the UI just asks.
// ---------------------------------------------------------------------------
export async function moveStage(contentId: string, toStatus: string, reason?: string): Promise<ActionState & { record?: ContentRecordRow }> {
  await requireActiveUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("move_stage", {
    p_content_id: contentId,
    p_to_status: toStatus,
    p_reason: reason?.trim() || undefined,
  });
  if (error) return { error: friendly(error.message, error.code) };
  revalidatePath("/content");
  revalidatePath("/board");
  revalidatePath(`/content/${data.content_id}`);
  return { success: "Moved", record: data };
}

// ---------------------------------------------------------------------------
// Field updates (concept, assignment, dates, folder)
// ---------------------------------------------------------------------------
const patchSchema = z.record(z.string(), z.unknown());

export async function updateContent(contentId: string, contentCode: string, patch: Record<string, unknown>): Promise<ActionState> {
  await requireActiveUser();
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) return { error: "Invalid input" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_content_fields", { p_content_id: contentId, p: parsed.data as Json });
  if (error) return { error: friendly(error.message, error.code) };
  revalidatePath(`/content/${contentCode}`);
  revalidatePath("/content");
  revalidatePath("/board");
  return { success: "Saved" };
}

/** Form-action wrapper for the Overview tab. Hidden inputs carry ids. */
export async function updateContentForm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const contentId = String(formData.get("content_id") ?? "");
  const contentCode = String(formData.get("content_code") ?? "");
  if (!contentId || !contentCode) return { error: "Missing record id" };

  const textKeys = [
    "title", "description", "request_type", "target_audience", "hook", "concept", "core_message",
    "audience_takeaway", "cta", "creative_direction", "reference_notes", "production_folder_url",
  ];
  const idKeys = ["program_id", "campaign_id", "campus_id", "content_type_id", "objective_id", "secondary_objective_id", "pillar_id",
    "dm_owner_id", "production_manager_id", "production_assignee_id"];
  const dateKeys = ["target_publish_date", "script_due", "production_due", "review_due"];

  const patch: Record<string, unknown> = {};
  const section = String(formData.get("_section") ?? "");
  for (const k of textKeys) if (formData.has(k)) patch[k] = String(formData.get(k) ?? "").trim() || null;
  for (const k of idKeys) if (formData.has(k)) patch[k] = String(formData.get(k) ?? "") || null;
  for (const k of dateKeys) if (formData.has(k)) patch[k] = String(formData.get(k) ?? "") || null;
  if (formData.has("priority")) patch.priority = String(formData.get("priority"));
  if (section === "concept") {
    patch.platform_ids = all(formData, "platform_ids");
    patch.differentiator_ids = all(formData, "differentiator_ids");
  }
  if (section === "settings") {
    patch.requires_ai_disclosure = formData.get("requires_ai_disclosure") === "on";
    patch.content_review_required = formData.get("content_review_required") === "on";
    const min = Number(formData.get("min_reviewer_responses") ?? 2);
    if (Number.isFinite(min)) patch.min_reviewer_responses = min;
  }
  if (patch.title === null) return { error: "Title is required" };
  if (patch.content_type_id === null) delete patch.content_type_id;

  return updateContent(contentId, contentCode, patch);
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------
const commentSchema = z.object({
  content_id: uuid,
  content_code: z.string().min(1),
  section: z.enum(["concept", "script", "production", "review", "final_approval", "general"]),
  body: z.string().trim().min(1, "Write something first"),
  mentions: z.array(uuid),
});

export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireActiveUser();
  const parsed = commentSchema.safeParse({
    content_id: formData.get("content_id"),
    content_code: formData.get("content_code"),
    section: formData.get("section") ?? "general",
    body: formData.get("body"),
    mentions: all(formData, "mentions"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_comment", {
    p_content_id: parsed.data.content_id,
    p_section: parsed.data.section as CommentSection,
    p_body: parsed.data.body,
    p_mentions: parsed.data.mentions,
  });
  if (error) return { error: friendly(error.message, error.code) };
  revalidatePath(`/content/${parsed.data.content_code}`);
  return { success: "Comment added" };
}

export async function resolveComment(commentId: string, contentCode: string, resolved: boolean): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_comment", { p_comment_id: commentId, p_resolved: resolved });
  if (error) return { error: friendly(error.message, error.code) };
  revalidatePath(`/content/${contentCode}`);
  return { success: resolved ? "Resolved" : "Reopened" };
}

export async function markAllNotificationsRead(): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notifications_read", { p_ids: undefined });
  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: "Marked read" };
}
