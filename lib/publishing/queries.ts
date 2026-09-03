import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  PublishConfirmationRow,
  PublishedLinkRow,
  PublishedLinkViewRow,
  PublishingQueueRow,
  ScheduleRow,
} from "@/lib/supabase/database.types";

export interface ScheduleWithNames extends ScheduleRow {
  platform_name: string;
  publisher_name: string | null;
  campaign_name: string | null;
}
export interface LinkWithNames extends PublishedLinkRow {
  platform_name: string;
  published_by_name: string | null;
}
export interface PublishingTabData {
  schedules: ScheduleWithNames[];
  links: LinkWithNames[];
  confirmations: PublishConfirmationRow[];
  publishers: { id: string; full_name: string }[];
  platforms: { id: string; name: string }[];
  campaigns: { id: string; name: string }[];
}

/** Everything the Publishing tab shows for one record. */
export async function getPublishingTab(contentId: string): Promise<PublishingTabData> {
  const supabase = await createClient();
  const [schedules, links, confirmations, platforms, campaigns, permRoles] = await Promise.all([
    supabase
      .from("schedules")
      .select("*")
      .eq("content_id", contentId)
      .is("cancelled_at", null)
      .order("scheduled_at"),
    supabase.from("published_links").select("*").eq("content_id", contentId).order("published_at"),
    supabase
      .from("publish_confirmations")
      .select("*")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false }),
    supabase.from("platforms").select("id, name").eq("is_active", true).order("sort_order"),
    supabase.from("campaigns").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("role_permissions")
      .select("role_id, permissions!inner(key)")
      .eq("permissions.key", "publish.publish"),
  ]);

  const roleIds = [...new Set((permRoles.data ?? []).map((r) => r.role_id))];
  const { data: publishers } = roleIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("role_id", roleIds)
        .eq("account_status", "active")
        .order("full_name")
    : { data: [] as { id: string; full_name: string }[] };

  const personIds = [
    ...new Set(
      [
        ...(schedules.data ?? []).map((s) => s.publisher_id),
        ...(links.data ?? []).map((l) => l.published_by),
      ].filter((x): x is string => !!x),
    ),
  ];
  const { data: people } = personIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", personIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameOf = (id: string | null) => people?.find((p) => p.id === id)?.full_name ?? null;
  const platformName = (id: string) => platforms.data?.find((p) => p.id === id)?.name ?? "Platform";

  return {
    schedules: (schedules.data ?? []).map((s) => ({
      ...s,
      platform_name: platformName(s.platform_id),
      publisher_name: nameOf(s.publisher_id),
      campaign_name: campaigns.data?.find((c) => c.id === s.campaign_id)?.name ?? null,
    })),
    links: (links.data ?? []).map((l) => ({
      ...l,
      platform_name: platformName(l.platform_id),
      published_by_name: nameOf(l.published_by),
    })),
    confirmations: confirmations.data ?? [],
    publishers: publishers ?? [],
    platforms: platforms.data ?? [],
    campaigns: campaigns.data ?? [],
  };
}

export interface PublishingQueue {
  today: PublishingQueueRow[];
  thisWeek: PublishingQueueRow[];
  later: PublishingQueueRow[];
  disclosurePending: PublishingQueueRow[];
  recentlyPublished: PublishedLinkViewRow[];
}

/** Publisher queue (D3): Today · This Week · Later · Disclosure pending · Recently published. */
export async function getPublishingQueue(now = new Date()): Promise<PublishingQueue> {
  const supabase = await createClient();
  const today = now.toISOString().slice(0, 10);
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  const since = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const [queue, published] = await Promise.all([
    supabase.from("v_publishing_queue").select("*").order("scheduled_at"),
    supabase
      .from("v_published_links")
      .select("*")
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(50),
  ]);
  const rows = queue.data ?? [];
  return {
    today: rows.filter((r) => (r.scheduled_date ?? "") <= today),
    thisWeek: rows.filter(
      (r) => (r.scheduled_date ?? "") > today && (r.scheduled_date ?? "") < weekEnd,
    ),
    later: rows.filter((r) => (r.scheduled_date ?? "") >= weekEnd),
    disclosurePending: rows.filter((r) => r.disclosure_pending),
    recentlyPublished: published.data ?? [],
  };
}
