import Link from "next/link";
import type { ContentReviewQueueRow } from "@/lib/final/queries";
import { formatDuration } from "@/lib/workflow/statuses";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PriorityBadge } from "@/components/content/priority-badge";

export function ContentReviewQueueTable({
  rows,
  empty,
  action,
}: {
  rows: ContentReviewQueueRow[];
  empty: string;
  action: string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Content</TableHead>
            <TableHead>Creative</TableHead>
            <TableHead>Responses</TableHead>
            <TableHead>Waiting</TableHead>
            <TableHead>DM owner</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.content_id}>
              <TableCell>
                <Link
                  href={`/reviews/content/${r.content_code}`}
                  className="font-mono text-xs font-medium hover:underline"
                >
                  {r.content_code}
                </Link>
                <div className="font-medium">{r.title}</div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                  <span>{r.region_code}</span>
                  <span>·</span>
                  <span>{r.content_type}</span>
                  <span>·</span>
                  <PriorityBadge priority={r.priority} />
                </div>
              </TableCell>
              <TableCell>
                {r.creative_version_no != null ? (
                  <span className="font-medium">V{r.creative_version_no}</span>
                ) : (
                  <span className="text-muted-foreground text-xs">No creative</span>
                )}
              </TableCell>
              <TableCell className="tabular-nums">
                {r.responses ?? 0} of {r.min_reviewer_responses ?? 0}
              </TableCell>
              <TableCell>
                <div className="text-sm">{formatDuration(r.seconds_in_stage)}</div>
                {r.is_overdue ? (
                  <span className="text-xs font-medium text-red-700 dark:text-red-400">
                    Overdue
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="text-sm">{r.dm_owner_name ?? "—"}</TableCell>
              <TableCell>
                {r.content_code ? (
                  <Button size="sm" render={<Link href={`/reviews/content/${r.content_code}`} />}>
                    {action}
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                {empty}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
