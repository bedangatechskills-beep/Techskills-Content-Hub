import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/access.server";
import { can } from "@/lib/permissions/access";
import { getTeamBoard } from "@/lib/production/queries";
import { formatDate, formatDuration, timeAgo } from "@/lib/workflow/statuses";
import { StatusPill } from "@/components/content/status-pill";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PersonCell } from "@/components/team/person-cell";
import { TeamBoardLive } from "@/components/team/team-board-live";
import { UnassignedTable } from "@/components/team/unassigned-table";
import { WorkStatusSelect } from "@/components/team/work-status-select";
import { WorkloadBadge, WorkStatusChip } from "@/components/team/workload-badge";
import type { AssignCandidate } from "@/components/team/assign-dialog";

export const metadata = { title: "Team Board" };

function isPast(d: string | null | undefined) {
  return !!d && new Date(d) < new Date(new Date().toDateString());
}

export default async function TeamBoardPage() {
  const access = await requireActiveUser();
  const board = await getTeamBoard();
  const me = access.profile.id;
  const canAssign = can(access, "production.assign");
  const candidates: AssignCandidate[] = board.production.map((p) => ({
    profile_id: p.profile_id ?? "",
    full_name: p.full_name ?? "",
    active_count: p.active_count ?? 0,
    workload_status: p.workload_status,
  }));

  return (
    <div className="space-y-8">
      <TeamBoardLive />
      <div>
        <h1 className="page-title">Team Board</h1>
        <p className="text-muted-foreground">Operational workload, not performance.</p>
      </div>

      {/* 1. Production Team (§74–78) */}
      <Card>
        <CardHeader>
          <CardTitle>Production Team</CardTitle>
          <CardDescription>
            Sorted by active workload, highest first; ties by overdue, then stalled, then name. Role
            does not affect order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {board.production.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active production team members.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Work status</TableHead>
                    <TableHead>Workload</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead className="text-right">Stalled</TableHead>
                    <TableHead>Current content</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>In stage</TableHead>
                    <TableHead>Last active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {board.production.map((p) => (
                    <TableRow key={p.profile_id ?? ""}>
                      <TableCell>
                        <PersonCell
                          profileId={p.profile_id ?? ""}
                          name={p.full_name ?? ""}
                          photoUrl={p.photo_url}
                          subtitle={p.role_name}
                        />
                      </TableCell>
                      <TableCell>
                        {p.profile_id === me ? (
                          <WorkStatusSelect value={p.work_status} />
                        ) : (
                          <WorkStatusChip status={p.work_status} />
                        )}
                      </TableCell>
                      <TableCell>
                        <WorkloadBadge status={p.workload_status} />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {p.active_count ?? 0}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${(p.overdue_count ?? 0) > 0 ? "font-medium text-red-700 dark:text-red-400" : "text-muted-foreground"}`}
                      >
                        {p.overdue_count ?? 0}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${(p.stalled_count ?? 0) > 0 ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}
                      >
                        {p.stalled_count ?? 0}
                      </TableCell>
                      <TableCell>
                        {p.current_content_code ? (
                          <div className="space-y-0.5">
                            <Link
                              href={`/content/${p.current_content_code}`}
                              className="font-mono text-xs hover:underline"
                            >
                              {p.current_content_code}
                            </Link>
                            <div className="max-w-[220px] truncate text-sm">{p.current_title}</div>
                            <StatusPill
                              name={p.current_status_name ?? ""}
                              colourKey={p.current_colour_key}
                              size="sm"
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Nothing active</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-sm ${isPast(p.current_due_date) ? "font-medium text-red-700 dark:text-red-400" : ""}`}
                      >
                        {formatDate(p.current_due_date)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {p.current_seconds_in_stage != null
                          ? formatDuration(p.current_seconds_in_stage)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {timeAgo(p.last_active_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Unassigned Work (§79–80) */}
      <Card>
        <CardHeader>
          <CardTitle>Unassigned Work</CardTitle>
          <CardDescription>
            Needs production and has no assignee. Assigning here updates the workload, the board
            order, the Kanban card and the record in one step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UnassignedTable rows={board.unassigned} candidates={candidates} canAssign={canAssign} />
        </CardContent>
      </Card>

      {/* 3. DM Team (§81) */}
      <Card>
        <CardHeader>
          <CardTitle>DM Team</CardTitle>
          <CardDescription>
            Members in both DM and Content Reviewer teams appear once with badges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {board.dm.length === 0 ? (
            <p className="text-muted-foreground text-sm">No DM team members.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Work status</TableHead>
                    <TableHead className="text-right">Active content</TableHead>
                    <TableHead className="text-right">Scripts waiting</TableHead>
                    <TableHead className="text-right">DM reviews waiting</TableHead>
                    <TableHead className="text-right">Feedback to action</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead className="text-right">Current tasks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {board.dm.map((p) => (
                    <TableRow key={p.profile_id ?? ""}>
                      <TableCell>
                        <div className="space-y-1">
                          <PersonCell
                            profileId={p.profile_id ?? ""}
                            name={p.full_name ?? ""}
                            photoUrl={p.photo_url}
                            subtitle={p.role_name}
                          />
                          <div className="flex flex-wrap gap-1 pl-11">
                            {p.in_dm ? <Badge variant="secondary">DM</Badge> : null}
                            {p.in_content_reviewer ? (
                              <Badge variant="outline">Reviewer</Badge>
                            ) : null}
                            {p.role_name === "Publisher" ? <Badge>Publisher</Badge> : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.profile_id === me ? (
                          <WorkStatusSelect value={p.work_status} />
                        ) : (
                          <WorkStatusChip status={p.work_status} />
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.stats?.active_content ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.stats?.scripts_waiting ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.stats?.dm_reviews_waiting ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.stats?.feedback_requiring_action ?? 0}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${(p.stats?.overdue ?? 0) > 0 ? "font-medium text-red-700 dark:text-red-400" : ""}`}
                      >
                        {p.stats?.overdue ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.stats?.current_tasks ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. CEO (§82) */}
      <Card>
        <CardHeader>
          <CardTitle>CEO</CardTitle>
          <CardDescription>Approval work waiting on the Final Approver.</CardDescription>
        </CardHeader>
        <CardContent>
          {board.ceo.length === 0 ? (
            <p className="text-muted-foreground text-sm">No CEO team members.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead>Work status</TableHead>
                    <TableHead className="text-right">Waiting final approval</TableHead>
                    <TableHead className="text-right">Waiting script approval</TableHead>
                    <TableHead className="text-right">Change requests</TableHead>
                    <TableHead className="text-right">Active approval work</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {board.ceo.map((p) => (
                    <TableRow key={p.profile_id ?? ""}>
                      <TableCell>
                        <PersonCell
                          profileId={p.profile_id ?? ""}
                          name={p.full_name ?? ""}
                          photoUrl={p.photo_url}
                          subtitle={p.role_name}
                        />
                      </TableCell>
                      <TableCell>
                        {p.profile_id === me ? (
                          <WorkStatusSelect value={p.work_status} />
                        ) : (
                          <WorkStatusChip status={p.work_status} />
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {p.stats?.waiting_final_approval ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.stats?.waiting_script_approval ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.stats?.change_requests ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.stats?.active_approval_work ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
