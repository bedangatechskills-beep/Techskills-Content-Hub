import Link from "next/link";
import { requirePermission } from "@/lib/auth/access.server";
import { getFinalApprovalQueue } from "@/lib/final/queries";
import { formatDate, formatDuration } from "@/lib/workflow/statuses";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PriorityBadge } from "@/components/content/priority-badge";
import { CreativeVerdictBadge } from "@/components/reviews/creative-verdict-badge";

export const metadata = { title: "Final approvals" };

export default async function FinalApprovalsPage() {
  const access = await requirePermission("final.approve");
  const rows = await getFinalApprovalQueue();
  const isApprover = access.profile.is_final_approver;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Final approvals</h1>
        <p className="text-muted-foreground">
          Everything here has passed every gate. Approving pins the exact script and creative
          versions.
        </p>
      </div>

      {!isApprover ? (
        <Alert>
          <AlertTitle>You cannot approve from this account</AlertTitle>
          <AlertDescription>
            Your role has the permission but not the Final Approver flag; an administrator controls
            it. You can still read the queue.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>DM owner</TableHead>
              <TableHead>Publish</TableHead>
              <TableHead>Waiting</TableHead>
              <TableHead>Gate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const late = !!r.target_publish_date && r.target_publish_date < today;
              return (
                <TableRow key={r.content_id}>
                  <TableCell>
                    <Link
                      href={`/approvals/final/${r.content_code}`}
                      className="font-mono text-xs hover:underline"
                    >
                      {r.content_code}
                    </Link>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-muted-foreground text-xs">{r.region_code}</div>
                  </TableCell>
                  <TableCell>{r.content_type}</TableCell>
                  <TableCell>
                    <PriorityBadge priority={r.priority} />
                  </TableCell>
                  <TableCell>{r.dm_owner_name ?? "—"}</TableCell>
                  <TableCell className={late ? "text-red-700 dark:text-red-400" : ""}>
                    {formatDate(r.target_publish_date)}
                  </TableCell>
                  <TableCell>{formatDuration(r.seconds_in_stage)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.is_reapproval ? <Badge>Re-approval</Badge> : null}
                      {(r.override_count ?? 0) > 0 ? (
                        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                          {r.override_count} override{r.override_count === 1 ? "" : "s"}
                        </Badge>
                      ) : null}
                      {(r.creative_open_flags ?? 0) > 0 ? (
                        <Badge className="bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200">
                          {r.creative_open_flags} open flags
                        </Badge>
                      ) : null}
                      {r.content_review_required ? (
                        <Badge variant="outline">Content review</Badge>
                      ) : null}
                      {r.creative_ai_score != null ? (
                        <span className="inline-flex items-center gap-1 text-xs">
                          AI {Number(r.creative_ai_score).toFixed(1)}/10
                          <CreativeVerdictBadge verdict={r.creative_ai_verdict} />
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground text-center">
                  Nothing waiting for final approval.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
