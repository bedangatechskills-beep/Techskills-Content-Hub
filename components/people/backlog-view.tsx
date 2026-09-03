import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonBacklog, listPeople } from "@/lib/production/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, timeAgo } from "@/lib/workflow/statuses";
import type { WorkStatus } from "@/lib/supabase/database.types";
import { PeoplePicker } from "./people-picker";
import { WorkStatusSelect } from "./work-status-select";
import { BacklogItemRow } from "./backlog-rows";

const WORKLOAD_LABEL: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  at_risk: "At risk",
};
const WORKLOAD_CLASS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  normal: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  high: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  at_risk: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warn" | "danger";
}) {
  const cls =
    tone === "danger" && value > 0
      ? "text-red-700 dark:text-red-400"
      : tone === "warn" && value > 0
        ? "text-amber-700 dark:text-amber-400"
        : "text-foreground";
  return (
    <div className="bg-card rounded-lg border px-4 py-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`text-2xl font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

function Section({
  title,
  count,
  description,
  empty,
  children,
}: {
  title: string;
  count: number;
  description?: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} <span className="text-muted-foreground font-normal">({count})</span>
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <p className="text-muted-foreground text-sm">{empty}</p>
        ) : (
          <ul className="divide-y">{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}

export async function BacklogView({
  profileId,
  viewerId,
  title,
}: {
  profileId: string;
  viewerId: string;
  title?: string;
}) {
  const [data, people] = await Promise.all([getPersonBacklog(profileId), listPeople()]);
  if (!data) notFound();
  const { profile, workload } = data;
  const isSelf = profile.id === viewerId;
  const workloadStatus = workload?.workload_status ?? "low";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">{title ?? `${profile.full_name}'s backlog`}</h1>
          <p className="text-muted-foreground">Read-only summary. Actions happen on the record.</p>
        </div>
        <PeoplePicker people={people} selectedId={profile.id} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar size="lg">
            {profile.photo_url ? <AvatarImage src={profile.photo_url} alt="" /> : null}
            <AvatarFallback className="bg-brand-blue text-xs font-semibold text-white">
              {initials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{profile.full_name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              {profile.role_name ? <Badge variant="secondary">{profile.role_name}</Badge> : null}
              {profile.teams.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
              {profile.job_title ? (
                <span className="text-muted-foreground">{profile.job_title}</span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <WorkStatusSelect
              value={(profile.work_status ?? "offline") as WorkStatus}
              editable={isSelf}
            />
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${WORKLOAD_CLASS[workloadStatus] ?? ""}`}
              title="Workload status is capacity, not quality"
            >
              Workload: {WORKLOAD_LABEL[workloadStatus] ?? workloadStatus}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Counter label="Active" value={workload?.active_count ?? 0} />
        <Counter label="Overdue" value={workload?.overdue_count ?? 0} tone="danger" />
        <Counter label="Stalled" value={workload?.stalled_count ?? 0} tone="warn" />
      </div>

      <Section
        title="Waiting on me"
        count={data.waiting_on_me.length}
        description="Items where this person is the next actor, derived from stage and role."
        empty="Nothing is waiting on this person."
      >
        {data.waiting_on_me.map((item, i) => (
          <BacklogItemRow key={`${item.id ?? i}-${item.task_id ?? "c"}`} item={item} />
        ))}
      </Section>

      <Section
        title="Assigned to me"
        count={data.assigned_to_me.length}
        description="Content and tasks where this person is the production assignee or DM owner."
        empty="No content or tasks assigned."
      >
        {data.assigned_to_me.map((item, i) => (
          <BacklogItemRow key={`${item.id ?? i}-${item.task_id ?? "c"}`} item={item} />
        ))}
      </Section>

      <Section
        title="Changes I asked for"
        count={data.changes_i_asked_for.length}
        description="Change requests this person raised."
        empty="No change requests raised."
      >
        {data.changes_i_asked_for.map((c, i) => (
          <li
            key={`${c.content_id}-${i}`}
            className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/content/${c.content_code}`}
                  className="text-primary font-mono text-xs underline-offset-4 hover:underline"
                >
                  {c.content_code}
                </Link>
                <span className="truncate font-medium">{c.title}</span>
              </div>
              {c.reason ? (
                <blockquote className="text-muted-foreground border-l-2 pl-3 text-sm italic">
                  {c.reason}
                </blockquote>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{timeAgo(c.created_at)}</span>
              {c.is_resolved ? (
                <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                  Resolved
                </Badge>
              ) : (
                <Badge className="bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200">
                  Unresolved
                </Badge>
              )}
            </div>
          </li>
        ))}
      </Section>

      <Section
        title="Blocked by others"
        count={data.blocked_by_others.length}
        description="Items this person owns that are sitting in someone else's stage."
        empty="Nothing is blocked."
      >
        {data.blocked_by_others.map((item, i) => (
          <BacklogItemRow key={`${item.id ?? i}-b`} item={item} showHolder />
        ))}
      </Section>

      <Section
        title="Recently done"
        count={data.recently_done.length}
        description="Completed actions in the last 14 days."
        empty="No activity in the last 14 days."
      >
        {data.recently_done.map((d, i) => (
          <li
            key={`${d.content_id}-${i}`}
            className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4"
          >
            <p className="min-w-0 flex-1 text-sm">{d.description}</p>
            <div className="flex items-center gap-2 text-xs">
              <Link
                href={`/content/${d.content_code}`}
                className="text-primary font-mono underline-offset-4 hover:underline"
              >
                {d.content_code}
              </Link>
              <span className="text-muted-foreground">{formatDateTime(d.created_at)}</span>
            </div>
          </li>
        ))}
      </Section>
    </div>
  );
}
