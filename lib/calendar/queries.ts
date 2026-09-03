import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CalendarItemRow } from "@/lib/supabase/database.types";
import { viewRange, type IsoDate } from "./grid";

export interface CalendarFilters {
  program?: string;
  campaign?: string;
  platform?: string;
  format?: string;
  objective?: string;
  owner?: string;
  status?: string;
  region?: string;
  kind?: string;
}

export async function getCalendarItems(
  view: "month" | "week",
  date: IsoDate,
  filters: CalendarFilters = {},
): Promise<{ items: CalendarItemRow[]; from: IsoDate; to: IsoDate }> {
  const supabase = await createClient();
  const { from, to } = viewRange(view, date);
  let q = supabase
    .from("v_calendar_items")
    .select("*")
    .gte("on_date", from)
    .lte("on_date", to)
    .order("on_date")
    .order("at_time", { ascending: true, nullsFirst: false });
  if (filters.program) q = q.eq("program_id", filters.program);
  if (filters.campaign) q = q.eq("campaign_id", filters.campaign);
  if (filters.platform) q = q.eq("platform_id", filters.platform);
  if (filters.format) q = q.eq("format", filters.format);
  if (filters.objective) q = q.eq("objective_id", filters.objective);
  if (filters.owner) q = q.eq("dm_owner_id", filters.owner);
  if (filters.status) q = q.eq("status_key", filters.status);
  if (filters.region) q = q.eq("region_code", filters.region);
  if (filters.kind) q = q.eq("kind", filters.kind);
  const { data } = await q;
  return { items: data ?? [], from, to };
}

/** Bank depth inputs: finished-but-unpublished vs. the last four weeks of publishing. */
export async function getBankDepth(): Promise<{ ready: number; publishedLast4Weeks: number }> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 28 * 86_400_000).toISOString();
  const [ready, published] = await Promise.all([
    supabase
      .from("content_records")
      .select("id", { count: "exact", head: true })
      .in("status_key", ["final_approved", "scheduled"]),
    supabase
      .from("content_records")
      .select("id", { count: "exact", head: true })
      .gte("published_at", since),
  ]);
  return { ready: ready.count ?? 0, publishedLast4Weeks: published.count ?? 0 };
}
