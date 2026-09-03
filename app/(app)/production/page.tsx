import { requirePermission } from "@/lib/auth/access.server";
import { getProductionOverview, getTeamBoard } from "@/lib/production/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentRows } from "@/components/team/content-rows";
import { TeamBoardLive } from "@/components/team/team-board-live";
import { UnassignedTable } from "@/components/team/unassigned-table";
import type { AssignCandidate } from "@/components/team/assign-dialog";

export const metadata = { title: "Production" };

export default async function ProductionPage() {
  await requirePermission("production.assign");
  const [overview, board] = await Promise.all([getProductionOverview(), getTeamBoard()]);
  const candidates: AssignCandidate[] = board.production.map((p) => ({
    profile_id: p.profile_id ?? "",
    full_name: p.full_name ?? "",
    active_count: p.active_count ?? 0,
    workload_status: p.workload_status,
  }));

  const stats = [
    { label: "Unassigned", value: overview.unassigned.length },
    { label: "In progress", value: overview.inProgress.length },
    { label: "Overdue", value: overview.overdue.length, alert: overview.overdue.length > 0 },
    { label: "Awaiting review", value: overview.awaitingReview.length },
    { label: "Changes required", value: overview.changesRequired.length },
  ];

  return (
    <div className="space-y-8">
      <TeamBoardLive />
      <div>
        <h1 className="page-title">Production</h1>
        <p className="text-muted-foreground">
          Assign by capacity and skill, review what comes back, keep an eye on what is late.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="py-4">
            <CardContent className="px-4">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {s.label}
              </p>
              <p
                className={`mt-1 text-2xl font-semibold tabular-nums ${s.alert ? "text-red-700 dark:text-red-400" : ""}`}
              >
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unassigned work</CardTitle>
          <CardDescription>
            Ready for allocation. Each option shows the person&apos;s current active work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UnassignedTable rows={overview.unassigned} candidates={candidates} canAssign />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>In progress</CardTitle>
          <CardDescription>Content currently in Production.</CardDescription>
        </CardHeader>
        <CardContent>
          <ContentRows
            rows={overview.inProgress}
            empty="Nothing in production right now."
            tab="production"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overdue</CardTitle>
          <CardDescription>Past the due date for its current stage.</CardDescription>
        </CardHeader>
        <CardContent>
          <ContentRows rows={overview.overdue} empty="Nothing overdue." tab="production" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Awaiting production review</CardTitle>
          <CardDescription>
            Submitted by the assignee; pass or return with a reason.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContentRows
            rows={overview.awaitingReview}
            empty="Nothing waiting for review."
            tab="production"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changes required</CardTitle>
          <CardDescription>Returned from review with a reason on the record.</CardDescription>
        </CardHeader>
        <CardContent>
          <ContentRows
            rows={overview.changesRequired}
            empty="No open change requests."
            tab="production"
          />
        </CardContent>
      </Card>
    </div>
  );
}
