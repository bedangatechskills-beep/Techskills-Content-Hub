import "server-only";
import { createClient } from "@/lib/supabase/server";
import { can, isFinalApprover, type Access } from "@/lib/permissions/access";
import type {
  CalendarItemRow,
  ContentMixRow,
  NeedsAttentionRow,
  PipelineCountRow,
  WorkloadRow,
} from "@/lib/supabase/database.types";

export type DashboardVariant =
  "ceo" | "dm" | "production_manager" | "production" | "reviewer" | "publisher" | "general";

/** Which dashboard a person gets (§85–89, D3). Bound to permissions, never to names. */
export function dashboardVariant(access: Access): DashboardVariant {
  if (isFinalApprover(access)) return "ceo";
  if (can(access, "dm.review")) return "dm";
  if (can(access, "production.assign")) return "production_manager";
  if (can(access, "production.update_own")) return "production";
  if (can(access, "review.rate")) return "reviewer";
  if (can(access, "publish.publish")) return "publisher";
  return "general";
}

export type DashboardCards = Record<string, number | null> & {
  ai_top_flags?: { key: string; count: number }[] | null;
};

export interface DashboardData {
  cards: DashboardCards;
  needsAttention: NeedsAttentionRow[];
  pipeline: PipelineCountRow[];
  activeTeam: WorkloadRow[];
  upcoming: CalendarItemRow[];
  mix: ContentMixRow[];
}

export async function getDashboard(): Promise<DashboardData> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const [cards, attention, pipeline, team, upcoming, mix] = await Promise.all([
    supabase.rpc("dashboard_cards"),
    supabase
      .from("v_needs_attention")
      .select("*")
      .order("sort_rank")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(40),
    supabase.from("v_pipeline_counts").select("*").order("sort_order"),
    supabase
      .from("v_workload")
      .select("*")
      .order("active_count", { ascending: false })
      .order("full_name")
      .limit(12),
    supabase
      .from("v_calendar_items")
      .select("*")
      .gte("on_date", today)
      .lte("on_date", horizon)
      .order("on_date")
      .order("at_time", { ascending: true, nullsFirst: false })
      .limit(12),
    supabase.from("v_content_mix").select("*"),
  ]);
  const raw = (cards.data ?? {}) as Record<string, unknown>;
  const flat: DashboardCards = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === "ai_top_flags") flat.ai_top_flags = v as { key: string; count: number }[];
    else flat[k] = typeof v === "number" ? v : v == null ? null : Number(v);
  }
  return {
    cards: flat,
    needsAttention: attention.data ?? [],
    pipeline: pipeline.data ?? [],
    activeTeam: (team.data ?? []).filter(
      (p) => (p.active_count ?? 0) > 0 || (p.work_status && p.work_status !== "offline"),
    ),
    upcoming: upcoming.data ?? [],
    mix: (mix.data ?? []).filter((m) => (m.active_count ?? 0) > 0),
  };
}
