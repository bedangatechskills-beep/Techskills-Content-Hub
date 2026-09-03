"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth/access.server";
import type { ActionState } from "@/lib/auth/actions";
import { autoRunCreativeCheck } from "@/lib/review/actions";
import type {
  CreativeKind,
  Json,
  ProductionDecision,
  TaskStatus,
  WorkStatus,
} from "@/lib/supabase/database.types";

function revalidateAll(code?: string) {
  if (code) revalidatePath(`/content/${code}`);
  revalidatePath("/content");
  revalidatePath("/board");
  revalidatePath("/team");
  revalidatePath("/production");
  revalidatePath("/me");
}

// ---------------------------------------------------------------------------
// Assignment (§80 cascade lives in the RPC)
// ---------------------------------------------------------------------------
export async function assignProduction(
  contentId: string,
  assigneeId: string | null,
  reason?: string,
  code?: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_production", {
    p_content_id: contentId,
    p_assignee_id: assigneeId ?? (null as unknown as string),
    p_reason: reason?.trim() || undefined,
  });
  if (error) return { error: error.message };
  revalidateAll(code);
  return { success: assigneeId ? "Assigned" : "Unassigned" };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
const taskSchema = z.object({
  content_id: z.string().uuid(),
  content_code: z.string().min(1),
  title: z.string().trim().min(1, "Task title is required"),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  assignee_id: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional()),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  start_date: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  due_date: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
});

export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireActiveUser();
  const parsed = taskSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await createClient();
  const d = parsed.data;
  const { error } = await supabase.rpc("create_task", {
    p_content_id: d.content_id,
    p_title: d.title,
    p_description: d.description,
    p_category: d.category,
    p_assignee_id: d.assignee_id,
    p_priority: d.priority,
    p_start_date: d.start_date,
    p_due_date: d.due_date,
  });
  if (error) return { error: error.message };
  revalidateAll(d.content_code);
  return { success: "Task added" };
}

export async function updateTask(
  taskId: string,
  patch: Record<string, unknown>,
  code?: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_task", { p_task_id: taskId, p: patch as Json });
  if (error) return { error: error.message };
  revalidateAll(code);
  return { success: "Task updated" };
}

export async function setTaskStatus(
  taskId: string,
  status: TaskStatus,
  code?: string,
): Promise<ActionState> {
  return updateTask(taskId, { status }, code);
}

// ---------------------------------------------------------------------------
// Creative versions: signed upload, then register
// ---------------------------------------------------------------------------
const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
];

export async function createCreativeUpload(
  contentId: string,
  fileName: string,
  mime: string,
): Promise<ActionState & { path?: string; token?: string }> {
  await requireActiveUser();
  if (!ALLOWED_MIME.includes(mime)) return { error: `File type ${mime} is not allowed` };
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("can_upload_creative", { p_content_id: contentId });
  if (!allowed) return { error: "You may not upload creatives for this record" };
  const { data: existing } = await supabase
    .from("creative_versions")
    .select("version_no")
    .eq("content_id", contentId)
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextNo = (existing?.version_no ?? 0) + 1;
  const safe = fileName.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);
  const path = `${contentId}/${nextNo}/${Date.now()}_${safe}`;
  const { data, error } = await supabase.storage.from("creatives").createSignedUploadUrl(path);
  if (error) return { error: error.message };
  return { success: "ready", path: data.path, token: data.token };
}

export async function registerCreativeVersion(input: {
  contentId: string;
  code: string;
  path: string;
  fileName: string;
  mime: string;
  size: number;
  kind: CreativeKind;
  width?: number;
  height?: number;
  duration?: number;
  note?: string;
}): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_creative_version", {
    p_content_id: input.contentId,
    p_storage_path: input.path,
    p_file_name: input.fileName,
    p_mime: input.mime,
    p_size_bytes: input.size,
    p_kind: input.kind,
    p_width: input.width,
    p_height: input.height,
    p_duration_s: input.duration,
    p_note: input.note,
  });
  if (error) return { error: error.message };
  // S9: the creative gate re-runs automatically on every new version.
  await autoRunCreativeCheck(data.id, input.code);
  revalidateAll(input.code);
  return { success: "Review version uploaded" };
}

// ---------------------------------------------------------------------------
// Review flow
// ---------------------------------------------------------------------------
export async function submitForProductionReview(
  contentId: string,
  code: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_for_production_review", { p_content_id: contentId });
  if (error) return { error: error.message };
  revalidateAll(code);
  return { success: "Submitted for production review" };
}

export async function productionReview(
  contentId: string,
  code: string,
  decision: ProductionDecision,
  checklist: Record<string, boolean>,
  notes?: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("production_review", {
    p_content_id: contentId,
    p_decision: decision,
    p_checklist: checklist as Json,
    p_notes: notes?.trim() || undefined,
  });
  if (error) return { error: error.message };
  if (decision === "pass") {
    // Gate runs on the reviewed creative before DM review (S9).
    const { data: rec } = await supabase
      .from("content_records")
      .select("current_creative_version_id")
      .eq("id", contentId)
      .maybeSingle();
    if (rec?.current_creative_version_id)
      await autoRunCreativeCheck(rec.current_creative_version_id, code);
  }
  revalidateAll(code);
  return { success: decision === "pass" ? "Production review passed" : "Returned to production" };
}

// ---------------------------------------------------------------------------
// Work status (own)
// ---------------------------------------------------------------------------
export async function setWorkStatus(status: WorkStatus): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_work_status", { p_status: status });
  if (error) return { error: error.message };
  revalidatePath("/team");
  revalidatePath("/me");
  revalidatePath("/", "layout");
  return { success: "Work status updated" };
}
