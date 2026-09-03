import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import type { DashboardData, DashboardVariant } from "@/lib/dashboard/queries";
import type { Access } from "@/lib/permissions/access";
import { formatDate, formatDateTime, statusStyle } from "@/lib/workflow/statuses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  ],
  dm: [
    { key: "concepts", label: "Concepts", href: "/content?status=idea_concept" },
    { key: "scripts", label: "Scripts", href: "/content?status=script_copy" },
    {
      key: "script_feedback",
      label: "Script Feedback",
      href: "/content?status=script_copy",
      tone: "warn",
    },
    { key: "dm_review_waiting", label: "Waiting DM Review", href: "/reviews/dm" },
    {
      key: "changes_assigned_dm",
      label: "Changes Assigned to DM",
      href: "/content?status=changes_required",
      tone: "warn",
    },
    { key: "reviewer_feedback", label: "Reviewer Feedback", href: "/reviews/content" },
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
      key: "production_in_progress",
      label: "Production in Progress",
      href: "/content?status=production",
    },
    { key: "overdue_production", label: "Overdue Production", href: "/production", tone: "danger" },
    {
      key: "production_review",
      label: "Production Review",
      href: "/content?status=production_review",
    },
    {
      key: "changes_assigned_production",
      label: "Changes Assigned to Production",
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
  ceo: "Final approver view",
  dm: "Digital marketing view",
  production_manager: "Production management view",
  production: "My production work",
  reviewer: "Content reviewer view",
  publisher: "Publisher view",
  general: "Overview",
};

export function StatCards({
  cards,
  defs,
}: {
  cards: Record<string, number | null>;
  defs: CardDef[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {defs.map((d) => {
        const n = cards[d.key] ?? 0;
        const hot = n > 0 && d.tone;
        return (
          <Link
            key={d.key}
            href={d.href}
            className={cn(
              "bg-card group rounded-xl border p-4 transition-shadow hover:shadow-md",
              hot === "danger" && "border-red-300 dark:border-red-800",
              hot === "warn" && "border-amber-300 dark:border-amber-800",
            )}
          >
            <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {d.label}
            </div>
            <div
              className={cn(
                "mt-1 text-3xl font-semibold tabular-nums",
                hot === "danger" && "text-red-700 dark:text-red-400",
                hot === "warn" && "text-amber-700 dark:text-amber-300",
              )}
            >
              {n}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function NeedsAttention({ rows }: { rows: DashboardData["needsAttention"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-600" aria-hidden /> Needs attention
        </CardTitle>
        <CardDescription>
          Overdue, stalled, open AI hard flags, Nepali pending, disclosure pending.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing needs attention right now.</p>
        ) : (
          <ul className="divide-y">
            {rows.slice(0, 12).map((r) => (
              <li key={`${r.id}-${r.reason_key}`} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <Link href={`/content/${r.content_code}`} className="font-medium hover:underline">
                    <span className="text-muted-foreground mr-2 font-mono text-xs">
                      {r.content_code}
                    </span>
                    {r.title}
                  </Link>
                  <div className="text-muted-foreground text-xs">
                    {r.reason_label}
                    {r.due_date ? ` · due ${formatDate(r.due_date)}` : ""}
                    {r.assignee_name
                      ? ` · ${r.assignee_name}`
                      : r.dm_owner_name
                        ? ` · ${r.dm_owner_name}`
                        : ""}
                  </div>
                </div>
                <PriorityBadge priority={r.priority ?? "normal"} />
                <StatusPill name={r.status_name ?? ""} colourKey={r.colour_key} size="sm" />
              </li>
            ))}
          </ul>
        )}
        {rows.length > 12 ? (
          <Link
            href="/board"
            className="mt-2 inline-flex items-center gap-1 text-xs hover:underline"
          >
            {rows.length - 12} more on the board <ArrowRight className="size-3" />
          </Link>
        ) : null}
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
          {total} active item{total === 1 ? "" : "s"} across 16 stages. Colour with label, never
          colour alone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="flex h-4 w-full overflow-hidden rounded-full border"
          role="img"
          aria-label="Pipeline distribution"
        >
          {active.map((p) =>
            (p.count ?? 0) > 0 ? (
              <div
                key={p.status_key}
                className={statusStyle(p.colour_key).bar}
                style={{ width: `${((p.count ?? 0) / Math.max(total, 1)) * 100}%` }}
                title={`${p.name}: ${p.count}`}
              />
            ) : null,
          )}
        </div>
        <ul className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-4">
          {pipeline.map((p) => (
            <li key={p.status_key} className="flex items-center gap-2">
              <span
                className={cn("inline-block size-2.5 rounded-full", statusStyle(p.colour_key).bar)}
                aria-hidden
              />
              <Link href={`/content?status=${p.status_key}`} className="truncate hover:underline">
                {p.name}
              </Link>
              <span className="ml-auto tabular-nums">
                {p.count}
                {(p.overdue_count ?? 0) > 0 ? (
                  <span className="ml-1 text-red-700 dark:text-red-400">
                    ({p.overdue_count} late)
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
        <CardTitle>Active team</CardTitle>
        <CardDescription>
          Who is on what right now. Workload is capacity, not quality.
        </CardDescription>
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
                        ? `${p.current_content_code} · ${p.current_title}`
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
        <Link href="/team" className="mt-2 inline-flex items-center gap-1 text-xs hover:underline">
          Team board <ArrowRight className="size-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function UpcomingContent({ items }: { items: DashboardData["upcoming"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming content</CardTitle>
        <CardDescription>Next 14 days: scheduled rows and target publish dates.</CardDescription>
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
                    {i.kind === "target" ? " (not yet scheduled)" : ""}
                  </div>
                </div>
                <StatusPill name={i.status_name ?? ""} colourKey={i.colour_key} size="sm" />
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/calendar"
          className="mt-2 inline-flex items-center gap-1 text-xs hover:underline"
        >
          Calendar <ArrowRight className="size-3" />
        </Link>
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

export function GateStat({ cards }: { cards: DashboardData["cards"] }) {
  const rate = cards.ai_pass_rate;
  const flags = cards.ai_top_flags ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI gate this month</CardTitle>
        <CardDescription>
          Pass rate and the three most-flagged defects: what to fix upstream.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="text-3xl font-semibold tabular-nums">{rate == null ? "—" : `${rate}%`}</div>
        {flags.length ? (
          <ul className="space-y-1">
            {flags.map((f) => (
              <li key={f.key} className="flex justify-between">
                <span className="font-mono text-xs">{f.key}</span>
                <span className="tabular-nums">{f.count}</span>
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

export function DashboardHero({ access, variant }: { access: Access; variant: DashboardVariant }) {
  return (
    <div className="bg-brand-navy relative overflow-hidden rounded-xl p-6 text-white md:p-8">
      <div
        className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full opacity-40 blur-3xl"
        style={{ background: "#005ea1" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full opacity-30 blur-3xl"
        style={{ background: "#f05921" }}
        aria-hidden
      />
      <p className="text-brand-orange relative text-xs font-semibold tracking-[0.2em] uppercase">
        {VARIANT_TITLE[variant]}
      </p>
      <h1 className="relative mt-1 text-3xl font-bold text-white">
        Hello, {access.profile.full_name.split(" ")[0]}
      </h1>
      <p className="relative mt-2 max-w-xl text-white/75">
        What needs you first, then the pipeline. Every number links to the list behind it.
      </p>
    </div>
  );
}
