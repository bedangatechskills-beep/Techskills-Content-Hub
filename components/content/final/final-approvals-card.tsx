import type { FinalApprovalEntry } from "@/lib/final/queries";
import { formatDateTime } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DECISION: Record<string, { label: string; cls: string }> = {
  approved: { label: "Approved", cls: "bg-emerald-600 text-white" },
  changes_requested: { label: "Changes requested", cls: "bg-orange-500 text-white" },
  rejected: { label: "Rejected", cls: "bg-red-600 text-white" },
};

export function FinalApprovalsCard({ approvals }: { approvals: FinalApprovalEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Final approvals</CardTitle>
        <CardDescription>
          Every decision pins the exact script and creative versions (§50). Rows are never edited.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {approvals.length === 0 ? (
          <p className="text-muted-foreground text-sm">No final approval decisions yet.</p>
        ) : (
          <ol className="divide-y rounded-md border">
            {approvals.map((f) => {
              const d = DECISION[f.decision] ?? { label: f.decision, cls: "" };
              return (
                <li key={f.id} className="space-y-1 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={d.cls}>{d.label}</Badge>
                    <span className="font-medium">{f.approver_name ?? "—"}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      script V{f.script_version_no ?? "—"} · creative V
                      {f.creative_version_no ?? "—"}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(f.created_at)}
                    </span>
                  </div>
                  {f.reason ? (
                    <p className="text-muted-foreground border-l-2 pl-2 text-xs">{f.reason}</p>
                  ) : null}
                  {f.override_reason ? (
                    <p className="rounded border border-amber-500/50 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      <span className="font-semibold">Override reason:</span> {f.override_reason}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
