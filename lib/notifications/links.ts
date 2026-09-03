import type { NotificationRow } from "@/lib/supabase/database.types";

export interface NotificationItem extends NotificationRow {
  content_code: string | null;
}

/** Where a notification deep-links to (§97: deep links into the record). */
export function notificationHref(n: NotificationItem): string {
  if (!n.content_code) return "/notifications";
  const t = n.type;
  if (t.startsWith("stage_")) return `/content/${n.content_code}`;
  if (t === "task_assigned" || t === "task_due_today" || t === "content_assigned")
    return `/content/${n.content_code}?tab=production`;
  if (t === "script_ready_for_review" || t === "re_approval_required")
    return `/content/${n.content_code}?tab=script`;
  if (t === "mentioned") return `/content/${n.content_code}?tab=comments`;
  if (
    t === "changes_requested" ||
    t === "reviewer_quorum_met" ||
    t === "override_recorded" ||
    t === "final_approval_required"
  )
    return `/content/${n.content_code}?tab=reviews`;
  if (
    t === "scheduled" ||
    t === "publishing_date_change" ||
    t === "unscheduled" ||
    t === "published" ||
    t === "publishing_today" ||
    t === "disclosure_pending" ||
    t === "archived"
  )
    return `/content/${n.content_code}?tab=publishing`;
  if (t === "ai_flags_found") return `/content/${n.content_code}?tab=script`;
  return `/content/${n.content_code}`;
}
