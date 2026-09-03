import Link from "next/link";
import { requirePermission } from "@/lib/auth/access.server";
import { getDmReviewQueue } from "@/lib/review/queries";
import { formatDuration } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
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
import { CreativeAiSummary } from "@/components/reviews/creative-verdict-badge";
import { RunCreativeCheck } from "@/components/reviews/run-creative-check";

export const metadata = { title: "DM / Brand Review" };

export default async function DmReviewQueuePage() {
  await requirePermission("dm.review");
  const rows = await getDmReviewQueue();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">DM / Brand Review</h1>
        <p className="text-muted-foreground">
          Defects are listed first so you can clear them before judging marketing quality.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Creative</TableHead>
              <TableHead>AI creative check</TableHead>
              <TableHead>Waiting</TableHead>
              <TableHead>Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.content_id}>
                <TableCell>
                  <Link
                    href={`/reviews/dm/${r.content_code}`}
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
                    {r.assignee_name ? (
                      <>
                        <span>·</span>
                        <span>Editor {r.assignee_name}</span>
                      </>
                    ) : null}
                    {r.loop_count && r.loop_count > 0 ? (
                      <Badge variant="outline">Revision {r.loop_count}</Badge>
                    ) : null}
                    {r.nepali_verification === "pending" ? (
                      <Badge variant="outline">Nepali pending</Badge>
                    ) : null}
                    {r.requires_ai_disclosure ? (
                      <Badge variant="outline">AI disclosure</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  {r.creative_version_id ? (
                    <>
                      <div className="font-medium">
                        V{r.creative_version_no} · {r.creative_kind}
                      </div>
                      <div className="text-muted-foreground max-w-[200px] truncate text-xs">
                        {r.file_name}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-xs">No creative uploaded</span>
                  )}
                </TableCell>
                <TableCell>
                  {r.evaluation_id ? (
                    <CreativeAiSummary
                      score={r.overall_score}
                      verdict={r.verdict}
                      openFlags={r.open_flag_count}
                    />
                  ) : r.creative_version_id && r.content_code ? (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">No AI check</span>
                      <RunCreativeCheck
                        creativeVersionId={r.creative_version_id}
                        contentCode={r.content_code}
                        size="xs"
                        label="Run"
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">No AI check</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{formatDuration(r.seconds_in_stage)}</div>
                  {r.is_overdue ? (
                    <span className="text-xs font-medium text-red-700 dark:text-red-400">
                      Overdue
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  {r.content_code ? (
                    <Button size="sm" render={<Link href={`/reviews/dm/${r.content_code}`} />}>
                      Review
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                  Nothing waiting for DM / Brand Review.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
