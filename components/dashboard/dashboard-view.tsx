import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Inbox,
  ShieldAlert,
} from "lucide-react";
import type { DashboardData, DashboardVariant, QueueItem } from "@/lib/dashboard/queries";
import type { Access } from "@/lib/permissions/access";
import { formatDate, formatDateTime, statusStyle } from "@/lib/workflow/statuses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/content/status-pill";
import { PriorityBadge } from "@/components/content/priority-badge";
import { PersonCell } from "@/components/team/person-cell";
import { WorkStatusChip, WorkloadBadge } from "@/components/team/workload-badge";
import { cn } from "@/lib/utils";

interface CardDef {
  key: string;
  label: string;
  href: string;
  tone?: "warn" | "danger";
}

/** Which cards each role sees first (§84–89, Publisher per D3). Order = priority. */
export const VARIANT_CARDS: Record<DashboardVariant, CardDef[]> = {
  ceo: [
    {
      key: "waiting_final_approval",
      label: "Waiting for My Final Approval",
      href: "/approvals/final",
    },
    {
      key: "ready_for_final_approval",
      label: "Ready for Final Approval",
      href: "/content?status=ready_for_final_approval",
    },
    {
      key: "changes_requested",
      label: "Changes Requested",
      href: "/content?status=changes_required",
      tone: "warn",
    },
    { key: "publishing_this_week", label: "Publishing This Week", href: "/calendar?view=week" },
    { key: "reviewer_issues", label: "Reviewer Issues", href: "/reviews/content", tone: "warn" },
    { key: "overdue", label: "Overdue", href: "/board", tone: "danger" },
    { key: "published_this_month", label: "Published This Month", href: "/publishing" },
    { key: "unassigned_work", label: "Unassigned Work", href: "/production" },
  ],
  dm: [
    { key: "dm_review_waiting", label: "Waiting DM Review", href: "/reviews/dm" },
    { key: "scripts", label: "Scripts in Progress", href: "/content?status=script_copy" },
    {
      key: "script_feedback",
      label: "Script Feedback",
      href: "/content?status=script_copy",
      tone: "warn",
    },
    { key: "concepts", label: "Concepts", href: "/content?status=idea_concept" },
    {
      key: "changes_assigned_dm",
      label: "Changes Assigned to DM",
      href: "/content?status=changes_required",
      tone: "warn",
    },
    {
      key: "ready_for_final_approval",
      label: "Ready for Final Approval",
      href: "/content?status=ready_for_final_approval",
    },
    { key: "publishing_this_week", label: "Publishing This Week", href: "/calendar?view=week" },
    { key: "overdue", label: "Overdue", href: "/board", tone: "danger" },
  ],
  production_manager: [
    { key: "unassigned_work", label: "Unassigned Work", href: "/production", tone: "warn" },
    {
      key: "production_review",
      label: "Production Review",
      href: "/content?status=production_review",
    },
    {
      key: "production_in_progress",
      label: "Production in Progress",
      href: "/content?status=production",
    },
    { key: "overdue_production", label: "Overdue Production", href: "/production", tone: "danger" },
    {
      key: "changes_assigned_production",
      label: "Changes for Production",
      href: "/content?status=changes_required",
      tone: "warn",
    },
    { key: "due_today", label: "Due Today", href: "/team" },
  ],
  production: [
    { key: "my_tasks", label: "My Tasks", href: "/me" },
    { key: "my_due_today", label: "Due Today", href: "/me", tone: "warn" },
    { key: "my_changes_requested", label: "Changes Requested", href: "/me", tone: "warn" },
    { key: "my_upcoming", label: "Upcoming", href: "/me" },
    { key: "my_waiting_review", label: "Waiting Review", href: "/me" },
    { key: "my_recently_completed", label: "Recently Completed", href: "/me" },
  ],
  reviewer: [
    { key: "my_reviews", label: "My Reviews", href: "/reviews/content" },
    { key: "due_today", label: "Due Today", href: "/reviews/content" },
    {
      key: "re_review_required",
      label: "Re-review Required",
      href: "/reviews/content",
      tone: "warn",
    },
    { key: "my_recently_reviewed", label: "Recently Reviewed", href: "/reviews/content" },
  ],
  publisher: [
    { key: "publishing_today", label: "Publishing Today", href: "/publishing" },
    { key: "publishing_this_week", label: "Publishing This Week", href: "/publishing" },
    { key: "disclosure_pending", label: "Disclosure Pending", href: "/publishing", tone: "warn" },
    { key: "recently_published", label: "Recently Published", href: "/publishing" },
  ],
  general: [
    { key: "due_today", label: "Due Today", href: "/board" },
    { key: "overdue", label: "Overdue", href: "/board", tone: "danger" },
    { key: "waiting_my_review", label: "Waiting for My Review", href: "/me" },
    {
      key: "waiting_final_approval",
      label: "Waiting for Final Approval",
      href: "/content?status=final_approval",
    },
    { key: "unassigned_work", label: "Unassigned Work", href: "/production" },
    { key: "publishing_this_week", label: "Publishing This Week", href: "/calendar?view=week" },
    { key: "published_this_month", label: "Published This Month", href: "/publishing" },
  ],
};

export const VARIANT_TITLE: Record<DashboardVariant, string> = {
  ceo: "Final approver",
  dm: "Digital marketing",
  production_manager: "Production management",
  production: "Production",
  reviewer: "Content reviewer",
  publisher: "Publisher",
  general: "Overview",
};

const PRIMARY_ACTION: Record<DashboardVariant, { label: string; href: string }> = {
  ceo: { label: "Open final approvals", href: "/approvals/final" },
  dm: { label: "Open DM reviews", href: "/reviews/dm" },
  production_manager: { label: "Open production", href: "/production" },
  production: { label: "Open my backlog", href: "/me" },
  reviewer: { label: "Open content reviews", href: "/reviews/content" },
  publisher: { label: "Open publishing", href: "/publishing" },
  general: { label: "Open the board", href: "/board" },
};

function todayLabel() {
  return new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Australia/Sydney",
  });
}

/** Compact header: who, which view, what needs them, one primary action. */
export function DashboardHeader({
  access,
  variant,
  needsYou,
  attention,
}: {
  access: Access;
  variant: DashboardVariant;
  needsYou: number;
  attention: number;
}) {
  const action = PRIMARY_ACTION[variant];
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
      <div>
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
          {VARIANT_TITLE[variant]} · {todayLabel()}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Hello, {access.profile.full_name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {needsYou > 0 ? (
            <>
              <span className="text-foreground font-medium">
                {needsYou} item{needsYou === 1 ? "" : "s"}
              </span>{" "}
              waiting on you
            </>
          ) : (
            "Nothing is waiting on you right now"
          )}
          {attention > 0 ? (
            <>
              {" · "}
              <span className="font-medium text-amber-700 dark:text-amber-300">
                {attention} need{attention === 1 ? "s" : ""} attention
              </span>
            </>
          ) : null}
        </p>
      </div>
      <div className="flex gap-2">
        <Button render={<Link href={action.href} />}>
          {action.label} <ArrowRight className="size-4" aria-hidden />
        </Button>
        <Button variant="outline" render={<Link href="/board" />}>
          Board
        </Button>
      </div>
    </div>
  );
}

export function StatCards({
  cards,
  defs,
}: {
  cards: Record<string, number | null>;
  defs: CardDef[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
      {defs.map((d) => {
        const n = cards[d.key] ?? 0;
        const hot = n > 0 ? d.tone : undefined;
        const zero = n === 0;
        return (
          <Link
            key={d.key}
            href={d.href}
            className={cn(
              "bg-card group hover:border-foreground/30 flex min-h-20 flex-col justify-between rounded-lg border px-3 py-2.5 transition-colors",
              hot === "danger" &&
                "border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20",
              hot === "warn" &&
                "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20",
            )}
          >
            <span className="text-muted-foreground text-[11px] leading-tight font-medium">
              {d.label}
            </span>
            <span
              className={cn(
                "text-2xl font-semibold tabular-nums",
                zero && "text-muted-foreground/60",
                hot === "danger" && "text-red-700 dark:text-red-400",
                hot === "warn" && "text-amber-700 dark:text-amber-300",
              )}
            >
              {n}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function whenLabel(item: QueueItem): string {
  if (!item.when) return "";
  return item.when.length > 10 ? formatDateTime(item.when) : formatDate(item.when);
}

/** The concrete list behind the first card: what to open now (10-second rule). */
export function YourQueue({ queue }: { queue: DashboardData["queue"] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="size-4" aria-hidden /> {queue.title}
            </CardTitle>
            <CardDescription>{queue.description}</CardDescription>
          </div>
          <Link
            href={queue.href}
            className="inline-flex items-center gap-1 text-xs hover:underline"
          >
            All <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {queue.items.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> Nothing waiting on you.
          </div>
        ) : (
          <ul className="divide-y">
            {queue.items.map((i) => (
              <li key={i.key}>
                <Link
                  href={i.href}
                  className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-md px-2 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      <span className="text-muted-foreground mr-2 font-mono text-xs">{i.code}</span>
                      {i.title}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {i.meta}
                      {i.when ? (
                        <span className={cn(i.overdue && "text-red-700 dark:text-red-400")}>
                          {i.meta ? " · " : ""}
                          {i.overdue ? "overdue " : "due "}
                          {whenLabel(i)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {i.tag ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                      {i.tag}
                    </span>
                  ) : null}
                  <PriorityBadge priority={i.priority ?? "normal"} />
                  {i.status_name ? (
                    <StatusPill name={i.status_name} colourKey={i.colour_key} size="sm" />
                  ) : null}
                  <ArrowRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function NeedsAttention({
  rows,
  scoped,
}: {
  rows: DashboardData["needsAttention"];
  scoped: boolean;
}) {
  // Group by reason so the list reads as "3 overdue, 2 with open flags".
  const groups = new Map<string, DashboardData["needsAttention"]>();
  for (const r of rows) {
    const k = r.reason_label ?? "Other";
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-600" aria-hidden /> Needs attention
        </CardTitle>
        <CardDescription>
          {scoped ? "On your content: " : ""}overdue, stalled, open AI hard flags, Nepali pending,
          disclosure pending.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> Nothing needs
            attention.
          </div>
        ) : (
          [...groups.entries()].map(([label, items]) => (
            <div key={label}>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                {label === "AI disclosure confirmation pending" ? (
                  <ShieldAlert className="size-3.5 text-amber-600" aria-hidden />
                ) : null}
                {label}
                <span className="bg-muted rounded-full px-1.5 text-[10px] tabular-nums">
                  {items.length}
                </span>
              </div>
              <ul className="divide-y">
                {items.slice(0, 5).map((r) => (
                  <li key={`${r.id}-${r.reason_key}`}>
                    <Link
                      href={`/content/${r.content_code}`}
                      className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-md px-2 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          <span className="text-muted-foreground mr-2 font-mono text-xs">
                            {r.content_code}
                          </span>
                          {r.title}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {r.assignee_name ?? r.dm_owner_name ?? ""}
                          {r.due_date ? ` · due ${formatDate(r.due_date)}` : ""}
                        </div>
                      </div>
                      <StatusPill name={r.status_name ?? ""} colourKey={r.colour_key} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
              {items.length > 5 ? (
                <Link
                  href="/board"
                  className="text-muted-foreground mt-1 inline-block text-xs hover:underline"
                >
                  +{items.length - 5} more on the board
                </Link>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function PipelineBar({ pipeline }: { pipeline: DashboardData["pipeline"] }) {
  const active = pipeline.filter((p) => !p.is_terminal);
  const total = active.reduce((a, p) => a + (p.count ?? 0), 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content pipeline</CardTitle>
        <CardDescription>
          {total} active item{total === 1 ? "" : "s"} across 16 stages. Click a stage to open it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="flex h-3 w-full overflow-hidden rounded-full border"
          role="img"
          aria-label="Pipeline distribution"
        >
          {active.map((p) =>
            (p.count ?? 0) > 0 ? (
              <Link
                key={p.status_key}
                href={`/content?status=${p.status_key}`}
                className={cn(statusStyle(p.colour_key).bar, "hover:opacity-80")}
                style={{ width: `${((p.count ?? 0) / Math.max(total, 1)) * 100}%` }}
                title={`${p.name}: ${p.count}`}
              />
            ) : null,
          )}
        </div>
        <ul className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
          {pipeline.map((p) => (
            <li key={p.status_key} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-block size-2.5 shrink-0 rounded-full",
                  statusStyle(p.colour_key).bar,
                )}
                aria-hidden
              />
              <Link
                href={`/content?status=${p.status_key}`}
                className={cn(
                  "truncate hover:underline",
                  (p.count ?? 0) === 0 && "text-muted-foreground",
                )}
                title={p.name ?? ""}
              >
                {p.name}
              </Link>
              <span className="ml-auto shrink-0 tabular-nums">
                {p.count}
                {(p.overdue_count ?? 0) > 0 ? (
                  <span className="ml-1 text-red-700 dark:text-red-400">
                    · {p.overdue_count} late
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function ActiveTeam({ team }: { team: DashboardData["activeTeam"] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Active team</CardTitle>
            <CardDescription>Who is on what. Workload is capacity, not quality.</CardDescription>
          </div>
          <Link href="/team" className="inline-flex items-center gap-1 text-xs hover:underline">
            Team board <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {team.length === 0 ? (
          <p className="text-muted-foreground text-sm">No one has active work.</p>
        ) : (
          <ul className="divide-y">
            {team.map((p) => (
              <li key={p.profile_id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <PersonCell
                    profileId={p.profile_id ?? ""}
                    name={p.full_name ?? ""}
                    photoUrl={p.photo_url}
                    subtitle={
                      p.current_title
                        ? `${p.active_count} active · ${p.current_content_code} ${p.current_title}`
                        : p.role_name
                    }
                  />
                </div>
                <WorkStatusChip status={p.work_status} />
                <WorkloadBadge status={p.workload_status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function UpcomingContent({ items }: { items: DashboardData["upcoming"] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" aria-hidden /> Upcoming
            </CardTitle>
            <CardDescription>Next 14 days of schedules and target dates.</CardDescription>
          </div>
          <Link href="/calendar" className="inline-flex items-center gap-1 text-xs hover:underline">
            Calendar <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing planned in the next two weeks.</p>
        ) : (
          <ul className="divide-y">
            {items.map((i) => (
              <li key={`${i.kind}-${i.item_id}`} className="flex items-center gap-3 py-2 text-sm">
                <div className="w-24 shrink-0 text-xs tabular-nums">
                  {i.at_time ? formatDateTime(i.at_time) : formatDate(i.on_date)}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/content/${i.content_code}?tab=publishing`}
                    className="block truncate font-medium hover:underline"
                  >
                    {i.title}
                  </Link>
                  <div className="text-muted-foreground text-xs">
                    {i.platform ?? "Target date"}
                    {i.kind === "target" ? " · not yet scheduled" : ""}
                  </div>
                </div>
                <StatusPill name={i.status_name ?? ""} colourKey={i.colour_key} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ContentMix({ mix }: { mix: DashboardData["mix"] }) {
  const total = mix.reduce((a, m) => a + (m.active_count ?? 0), 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content mix</CardTitle>
        <CardDescription>Active records by content type.</CardDescription>
      </CardHeader>
      <CardContent>
        {mix.length === 0 ? (
          <p className="text-muted-foreground text-sm">No active content.</p>
        ) : (
          <ul className="space-y-2">
            {mix.map((m) => (
              <li key={m.content_type_id} className="text-sm">
                <div className="flex justify-between">
                  <span>{m.name}</span>
                  <span className="tabular-nums">{m.active_count}</span>
                </div>
                <div className="bg-muted mt-1 h-1.5 w-full rounded-full">
                  <div
                    className="bg-brand-blue h-1.5 rounded-full"
                    style={{ width: `${((m.active_count ?? 0) / Math.max(total, 1)) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const FLAG_LABEL: Record<string, string> = {
  spelling_grammar_en: "English spelling / grammar",
  nepali_verify: "Nepali needs verification",
  outcome_or_salary_claim: "Outcome or salary claim",
  visa_advice: "Visa advice",
  missing_source: "Statistic without source",
  active_it_not_transparent: "Active IT not transparent",
  wrong_region_language: "Wrong language for region",
  retired_handle: "Retired handle",
  fact_mismatch: "Fact mismatch",
  cta_missing_or_mismatch: "CTA missing or mismatched",
  format_safe_zone: "Format / safe zone",
};

export function GateStat({ cards }: { cards: DashboardData["cards"] }) {
  const rate = cards.ai_pass_rate;
  const flags = cards.ai_top_flags ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI gate this month</CardTitle>
        <CardDescription>Clean-pass rate and the three most common defects.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            {rate == null ? "—" : `${rate}%`}
          </span>
          <span className="text-muted-foreground text-xs">of checks had no hard flags</span>
        </div>
        {flags.length ? (
          <ul className="space-y-1.5">
            {flags.map((f) => (
              <li key={f.key} className="flex items-center justify-between gap-2">
                <span>{FLAG_LABEL[f.key] ?? f.key.replaceAll("_", " ")}</span>
                <span className="bg-muted rounded-full px-2 text-xs tabular-nums">{f.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No hard flags this month.</p>
        )}
      </CardContent>
    </Card>
  );
}
