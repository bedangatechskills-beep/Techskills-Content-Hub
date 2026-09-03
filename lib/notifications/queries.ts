import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { NotificationItem } from "./links";

export type { NotificationItem } from "./links";

/** Latest notifications for the signed-in user (RLS scopes to own rows). */
export async function getNotifications(limit = 30): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.content_id).filter((x): x is string => !!x))];
  const { data: recs } = ids.length
    ? await supabase.from("content_records").select("id, content_id").in("id", ids)
    : { data: [] as { id: string; content_id: string }[] };
  return rows.map((r) => ({
    ...r,
    content_code: recs?.find((c) => c.id === r.content_id)?.content_id ?? null,
  }));
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("unread_notification_count");
  return data ?? 0;
}
