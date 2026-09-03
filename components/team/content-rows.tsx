import Link from "next/link";
import type { KanbanCardRow } from "@/lib/supabase/database.types";
import { formatDate, timeAgo } from "@/lib/workflow/statuses";
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

/** Compact content table used by the Production overview sections. */
export function ContentRows({
  rows,
  empty,
  tab,
}: {
  rows: KanbanCardRow[];
  empty: string;
  /** Record tab to deep-link to */
  tab?: string;
}) {
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Content</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id ?? c.content_id ?? ""}>
              <TableCell>
                <Link
                  href={`/content/${c.content_id}${tab ? `?tab=${tab}` : ""}`}
                  className="font-mono text-xs hover:underline"
                >
                  {c.content_id}
                </Link>
                <div className="font-medium">{c.title}</div>
              </TableCell>
              <TableCell className="text-sm">
                {c.assignee_name ?? <span className="text-muted-foreground">Unassigned</span>}
              </TableCell>
              <TableCell>
                <StatusPill name={c.status_name ?? ""} colourKey={c.colour_key} size="sm" />
              </TableCell>
              <TableCell className="text-sm">
                {c.is_overdue ? (
                  <span className="font-medium text-red-700 dark:text-red-400">
                    Overdue · {formatDate(c.due_date)}
                  </span>
                ) : (
                  formatDate(c.due_date)
                )}
              </TableCell>
              <TableCell>
                <PriorityBadge priority={c.priority} />
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {timeAgo(c.last_activity_at)}
                {c.last_activity_by ? ` by ${c.last_activity_by}` : ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
