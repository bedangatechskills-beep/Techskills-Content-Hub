"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth/access.server";
import type { ActionState } from "@/lib/auth/actions";

export async function markNotificationRead(id: string): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notification_read", { p_id: id });
  if (error) return { error: error.message };
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { success: "Marked read" };
}

export async function markAllNotificationsRead(): Promise<ActionState> {
  await requireActiveUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_all_notifications_read");
  if (error) return { error: error.message };
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { success: `${data ?? 0} marked read` };
}
