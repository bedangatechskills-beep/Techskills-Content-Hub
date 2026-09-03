import Link from "next/link";
import type { UnassignedWorkRow } from "@/lib/supabase/database.types";
import { formatDate, formatDuration } from "@/lib/workflow/statuses";
import { StatusPill } from "@/components/content/status-pill";
import { PriorityBadge } from "@/components/content/priority-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssignButton, type AssignCandidate } from "./assign-dialog";

export function UnassignedTable({
  rows,
  candidates,
  canAssign,
}: {
  rows: UnassignedWorkRow[];
  candidates: AssignCandidate[];
  canAssign: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">Nothing waiting for assignment.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Content</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>DM owner</TableHead>
            <TableHead>In stage</TableHead>
            {canAssign ? <TableHead className="text-right">Assign</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id ?? r.content_id ?? ""}>
              <TableCell>
                <Link
                  href={`/content/${r.content_id}`}
                  className="font-mono text-xs hover:underline"
                >
                  {r.content_id}
                </Link>
                <div className="font-medium">{r.title}</div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{r.content_type}</TableCell>
              <TableCell>
                <PriorityBadge priority={r.priority} />
              </TableCell>
              <TableCell className="text-sm">
                {r.is_overdue ? (
                  <span className="font-medium text-red-700 dark:text-red-400">
                    Overdue · {formatDate(r.due_date)}
                  </span>
                ) : (
                  formatDate(r.due_date)
                )}
              </TableCell>
              <TableCell>
                <StatusPill name={r.status_name ?? ""} colourKey={r.colour_key} size="sm" />
              </TableCell>
              <TableCell className="text-sm">
                {r.dm_owner_name ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatDuration(r.seconds_in_stage)}
              </TableCell>
              {canAssign ? (
                <TableCell className="text-right">
                  {r.id && r.content_id ? (
                    <AssignButton
                      contentId={r.id}
                      contentCode={r.content_id}
                      title={r.title ?? ""}
                      candidates={candidates}
                    />
                  ) : null}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
