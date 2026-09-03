"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth/access.server";
import type { ActionState } from "@/lib/auth/actions";
import type { Json } from "@/lib/supabase/database.types";

function revalidate(code?: string) {
  if (code) revalidatePath(`/content/${code}`);
  revalidatePath("/content");
  revalidatePath("/board");
  revalidatePath("/publishing");
  revalidatePath("/calendar");
  revalidatePath("/");
}

const scheduleItem = z.object({
  platform_id: z.string().uuid(),
  scheduled_at: z.string().min(1, "Date and time are required"),
  publisher_id: z.string().uuid().nullable().optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type ScheduleItemInput = z.infer<typeof scheduleItem>;

/** Schedule (or re-schedule) a Final Approved record per platform (§53). */
export async function scheduleContent(
  contentId: string,
  code: string,
  items: ScheduleItemInput[],
  reason?: string,
): Promise<ActionState> {
  await requireActiveUser();
  const parsed = z.array(scheduleItem).min(1, "Add at least one platform").safeParse(items);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid schedule" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("schedule_content", {
    p_content_id: contentId,
    p_items: parsed.data as unknown as Json,
    p_reason: reason?.trim() || undefined,
  });
  if (error) return { error: error.message };
  revalidate(code);
  return { success: "Schedule saved" };
}

export async function unscheduleContent(
  contentId: string,
  code: string,
  reason: string,
): Promise<ActionState> {
  await requireActiveUser();
  if (!reason.trim()) return { error: "A reason is required" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("unschedule_content", {
    p_content_id: contentId,
    p_reason: reason.trim(),
  });
  if (error) return { error: error.message };
  revalidate(code);
  return { success: "Unscheduled. Back in Final Approved." };
}

const linkItem = z.object({
  platform_id: z.string().uuid(),
  url: z.string().trim(),
});
export type LinkInput = z.infer<typeof linkItem>;

/** Mark published with live URLs; blocked without the AI disclosure confirmation when required (§54). */
export async function publishContent(
  contentId: string,
  code: string,
  links: LinkInput[],
  disclosureConfirmed: boolean,
  note?: string,
  publishedAt?: string,
): Promise<ActionState> {
  await requireActiveUser();
  const parsed = z.array(linkItem).safeParse(links);
  if (!parsed.success) return { error: "Invalid links" };
  const filled = parsed.data.filter((l) => l.url.length > 0);
  if (filled.length === 0) return { error: "Enter at least one live URL" };
  for (const l of filled) {
    if (!/^https?:\/\//i.test(l.url)) return { error: `URL must start with http(s)://: ${l.url}` };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_content", {
    p_content_id: contentId,
    p_links: filled as unknown as Json,
    p_disclosure_confirmed: disclosureConfirmed,
    p_note: note?.trim() || undefined,
    p_published_at: publishedAt || undefined,
  });
  if (error) return { error: error.message };
  revalidate(code);
  return { success: "Published. Live URLs stored." };
}

export async function archiveContent(
  contentId: string,
  code: string,
  reason?: string,
): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_content", {
    p_content_id: contentId,
    p_reason: reason?.trim() || undefined,
  });
  if (error) return { error: error.message };
  revalidate(code);
  return { success: "Archived. It stays searchable." };
}
