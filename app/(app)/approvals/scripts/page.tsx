import Link from "next/link";
import { requirePermission } from "@/lib/auth/access.server";
import { getScriptApprovalQueue } from "@/lib/script/queries";
import { formatDuration, timeAgo } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PriorityBadge } from "@/components/content/priority-badge";
import { AiSummary } from "@/components/approvals/verdict-badge";
import { ApprovalActions } from "@/components/approvals/approval-actions";

export const metadata = { title: "Script approvals" };

export default async function ScriptApprovalsPage() {
  await requirePermission("script.approve");
  const rows = await getScriptApprovalQueue();
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Script approvals</h1>
        <p className="text-muted-foreground">
          Versions waiting for your decision. Approving pins that exact version.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Change summary</TableHead>
              <TableHead>AI check</TableHead>
              <TableHead>Waiting</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const waitingSeconds = r.waiting_since
                ? Math.max(0, Math.floor((now - new Date(r.waiting_since).getTime()) / 1000))
                : null;
              return (
                <TableRow key={r.content_id}>
                  <TableCell>
                    <Link
                      href={`/approvals/scripts/${r.content_code}`}
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
                      {r.dm_owner_name ? (
                        <>
                          <span>·</span>
                          <span>DM {r.dm_owner_name}</span>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">V{r.version_no}</div>
                    <div className="text-muted-foreground text-xs">
                      {r.version_author ?? "Unknown"} · {timeAgo(r.version_created_at)}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px] text-sm">
                    {r.change_summary ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {r.evaluation_id ? (
                      <AiSummary
                        score={r.overall_score}
                        verdict={r.verdict}
                        flagCount={r.flag_count}
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">No AI check</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDuration(waitingSeconds)}</div>
                    {r.is_reapproval ? <Badge variant="outline">Re-approval</Badge> : null}
                  </TableCell>
                  <TableCell>
                    {r.version_id && r.version_no != null && r.content_code ? (
                      <ApprovalActions
                        versionId={r.version_id}
                        versionNo={r.version_no}
                        contentCode={r.content_code}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                  Nothing waiting for approval.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
