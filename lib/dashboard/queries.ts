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

export function isManagerView(v: DashboardVariant): boolean {
  return v === "ceo" || v === "dm" || v === "production_manager";
}

export type DashboardCards = Record<string, number | null> & {
  ai_top_flags?: { key: string; count: number }[] | null;
};

/** One concrete item the person can act on now. */
export interface QueueItem {
  key: string;
  code: string;
  title: string;
  status_name: string | null;
  colour_key: string | null;
  priority: string | null;
  /** short context: who / what / how long */
  meta: string;
  /** ISO date or timestamp the item is due or scheduled for */
  when: string | null;
  overdue: boolean;
  href: string;
  tag?: string;
}

export interface DashboardData {
  variant: DashboardVariant;
  cards: DashboardCards;
  queue: { title: string; description: string; href: string; items: QueueItem[] };
  needsAttention: NeedsAttentionRow[];
  pipeline: PipelineCountRow[];
  activeTeam: WorkloadRow[];
  upcoming: CalendarItemRow[];
  mix: ContentMixRow[];
}

function waiting(seconds: number | null | undefined): string {
  if (seconds == null) return "";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `waiting ${d}d`;
  if (h > 0) return `waiting ${h}h`;
  return "just arrived";
}

async function loadQueue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  variant: DashboardVariant,
  me: string,
): Promise<DashboardData["queue"]> {
  const limit = 8;
  switch (variant) {
    case "ceo": {
      const { data } = await supabase
        .from("v_final_approval_queue")
        .select("*")
        .order("stage_entered_at")
        .limit(limit);
      return {
        title: "Waiting for your final approval",
        description: "Everything here has passed every gate.",
        href: "/approvals/final",
        items: (data ?? []).map((r) => ({
          key: r.content_id ?? "",
          code: r.content_code ?? "",
          title: r.title ?? "",
          status_name: "Final Approval",
          colour_key: "purple",
          priority: r.priority,
          meta: [r.dm_owner_name, waiting(r.seconds_in_stage)].filter(Boolean).join(" · "),
          when: r.target_publish_date,
          overdue: !!r.is_overdue,
          href: `/approvals/final/${r.content_code}`,
          tag: r.is_reapproval
            ? "Re-approval"
            : (r.override_count ?? 0) > 0
              ? `${r.override_count} override`
              : undefined,
        })),
      };
    }
    case "dm": {
      const [dm, scripts] = await Promise.all([
        supabase.from("v_dm_review_queue").select("*").order("stage_entered_at").limit(limit),
        supabase
          .from("v_kanban_cards")
          .select(
            "id, content_id, title, status_name, colour_key, priority, due_date, is_overdue, seconds_in_stage, assignee_name",
          )
          .in("status_key", ["script_copy", "ready_for_final_approval", "changes_required"])
          .order("is_overdue", { ascending: false })
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(limit),
      ]);
      const a: QueueItem[] = (dm.data ?? []).map((r) => ({
        key: r.content_id ?? "",
        code: r.content_code ?? "",
        title: r.title ?? "",
        status_name: "DM / Brand Review",
        colour_key: "amber",
        priority: r.priority,
        meta: [r.assignee_name, waiting(r.seconds_in_stage)].filter(Boolean).join(" · "),
        when: r.due_date,
        overdue: !!r.is_overdue,
        href: `/reviews/dm/${r.content_code}`,
        tag: (r.open_flag_count ?? 0) > 0 ? `${r.open_flag_count} flags` : undefined,
      }));
      const b: QueueItem[] = (scripts.data ?? []).map((r) => ({
        key: r.id ?? "",
        code: r.content_id ?? "",
        title: r.title ?? "",
        status_name: r.status_name,
        colour_key: r.colour_key,
        priority: r.priority,
        meta: [r.assignee_name, waiting(r.seconds_in_stage)].filter(Boolean).join(" · "),
        when: r.due_date,
        overdue: !!r.is_overdue,
        href: `/content/${r.content_id}`,
      }));
      return {
        title: "Your queue",
        description: "DM reviews first, then scripts, items ready to submit and change loops.",
        href: "/reviews/dm",
        items: [...a, ...b].slice(0, limit),
      };
    }
    case "production_manager": {
      const [un, rev] = await Promise.all([
        supabase
          .from("v_unassigned_work")
          .select("*")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(limit),
        supabase
          .from("v_kanban_cards")
          .select(
            "id, content_id, title, status_name, colour_key, priority, due_date, is_overdue, seconds_in_stage, assignee_name",
          )
          .eq("status_key", "production_review")
          .order("stage_entered_at")
          .limit(limit),
      ]);
      const a: QueueItem[] = (un.data ?? []).map((r) => ({
        key: r.id ?? "",
        code: r.content_id ?? "",
        title: r.title ?? "",
        status_name: r.status_name,
        colour_key: r.colour_key,
        priority: r.priority,
        meta: "Unassigned",
        when: r.due_date,
        overdue: !!r.is_overdue,
        href: "/production",
        tag: "Assign",
      }));
      const b: QueueItem[] = (rev.data ?? []).map((r) => ({
        key: r.id ?? "",
        code: r.content_id ?? "",
        title: r.title ?? "",
        status_name: r.status_name,
        colour_key: r.colour_key,
        priority: r.priority,
        meta: [r.assignee_name, waiting(r.seconds_in_stage)].filter(Boolean).join(" · "),
        when: r.due_date,
        overdue: !!r.is_overdue,
        href: `/content/${r.content_id}?tab=production`,
        tag: "Review",
      }));
      return {
        title: "Your queue",
        description: "Unassigned work first, then production reviews waiting on you.",
        href: "/production",
        items: [...a, ...b].slice(0, limit),
      };
    }
    case "production": {
      const { data } = await supabase
        .from("v_active_work")
        .select("*")
        .eq("profile_id", me)
        .order("is_overdue", { ascending: false })
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(limit);
      return {
        title: "My work",
        description: "Content assigned to you and open tasks, soonest first.",
        href: "/me",
        items: (data ?? []).map((r) => ({
          key: `${r.kind}-${r.task_id ?? r.content_id}`,
          code: r.content_code ?? "",
          title: r.title ?? "",
          status_name: r.status_name,
          colour_key: r.colour_key,
          priority: r.priority,
          meta: r.kind === "task" ? "Task" : "Content",
          when: r.due_date,
          overdue: !!r.is_overdue,
          href: `/content/${r.content_code}?tab=production`,
        })),
      };
    }
    case "reviewer": {
      const { data } = await supabase
        .from("v_content_review_queue")
        .select("*")
        .order("stage_entered_at")
        .limit(limit);
      return {
        title: "My reviews",
        description: "Content Review items you have not rated on the current creative.",
        href: "/reviews/content",
        items: (data ?? [])
          .filter((r) => !r.rated_by_me)
          .map((r) => ({
            key: r.content_id ?? "",
            code: r.content_code ?? "",
            title: r.title ?? "",
            status_name: "Content Review",
            colour_key: "indigo",
            priority: r.priority,
            meta: `${r.responses ?? 0}/${r.min_reviewer_responses ?? 0} responses · ${waiting(r.seconds_in_stage)}`,
            when: r.due_date,
            overdue: !!r.is_overdue,
            href: `/reviews/content/${r.content_code}`,
            tag: r.re_review_required ? "Re-review" : undefined,
          })),
      };
    }
    case "publisher": {
      const { data } = await supabase
        .from("v_publishing_queue")
        .select("*")
        .order("scheduled_at")
        .limit(limit);
      const today = new Date().toISOString().slice(0, 10);
      return {
        title: "Publishing queue",
        description:
          "Scheduled rows, soonest first. Amber means the AI disclosure must be confirmed.",
        href: "/publishing",
        items: (data ?? []).map((r) => ({
          key: r.schedule_id ?? "",
          code: r.content_code ?? "",
          title: r.title ?? "",
          status_name: "Scheduled",
          colour_key: "teal",
          priority: r.priority,
          meta: [r.platform, r.publisher_name].filter(Boolean).join(" · "),
          when: r.scheduled_at,
          overdue: (r.scheduled_date ?? "") < today,
          href: `/content/${r.content_code}?tab=publishing`,
          tag: r.disclosure_pending ? "AI disclosure" : undefined,
        })),
      };
    }
    default: {
      const { data } = await supabase
        .from("v_kanban_cards")
        .select(
          "id, content_id, title, status_name, colour_key, priority, due_date, is_overdue, seconds_in_stage, assignee_name",
        )
        .or(`dm_owner_id.eq.${me},production_assignee_id.eq.${me}`)
        .eq("is_terminal", false)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(limit);
      return {
        title: "Your content",
        description: "Records you own or are assigned to.",
        href: "/me",
        items: (data ?? []).map((r) => ({
          key: r.id ?? "",
          code: r.content_id ?? "",
          title: r.title ?? "",
          status_name: r.status_name,
          colour_key: r.colour_key,
          priority: r.priority,
          meta: r.assignee_name ?? "",
          when: r.due_date,
          overdue: !!r.is_overdue,
          href: `/content/${r.content_id}`,
        })),
      };
    }
  }
}

export async function getDashboard(access: Access): Promise<DashboardData> {
  const supabase = await createClient();
  const variant = dashboardVariant(access);
  const manager = isManagerView(variant);
  const me = access.profile.id;
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

  let attentionQ = supabase
    .from("v_needs_attention")
    .select("*")
    .order("sort_rank")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(40);
  // Individuals see only what is theirs; managers see everything (§84).
  if (!manager) attentionQ = attentionQ.or(`dm_owner_id.eq.${me},production_assignee_id.eq.${me}`);

  const [cards, queue, attention, pipeline, team, upcoming, mix] = await Promise.all([
    supabase.rpc("dashboard_cards"),
    loadQueue(supabase, variant, me),
    attentionQ,
    manager
      ? supabase.from("v_pipeline_counts").select("*").order("sort_order")
      : Promise.resolve({ data: [] as PipelineCountRow[] }),
    manager
      ? supabase
          .from("v_workload")
          .select("*")
          .order("active_count", { ascending: false })
          .order("full_name")
          .limit(12)
      : Promise.resolve({ data: [] as WorkloadRow[] }),
    supabase
      .from("v_calendar_items")
      .select("*")
      .gte("on_date", today)
      .lte("on_date", horizon)
      .order("on_date")
      .order("at_time", { ascending: true, nullsFirst: false })
      .limit(12),
    manager
      ? supabase.from("v_content_mix").select("*")
      : Promise.resolve({ data: [] as ContentMixRow[] }),
  ]);

  const raw = (cards.data ?? {}) as Record<string, unknown>;
  const flat: DashboardCards = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === "ai_top_flags") flat.ai_top_flags = v as { key: string; count: number }[];
    else flat[k] = typeof v === "number" ? v : v == null ? null : Number(v);
  }
  return {
    variant,
    cards: flat,
    queue,
    needsAttention: attention.data ?? [],
    pipeline: pipeline.data ?? [],
    activeTeam: (team.data ?? []).filter(
      (p) => (p.active_count ?? 0) > 0 || (p.work_status && p.work_status !== "offline"),
    ),
    upcoming: upcoming.data ?? [],
    mix: (mix.data ?? []).filter((m) => (m.active_count ?? 0) > 0),
  };
}
