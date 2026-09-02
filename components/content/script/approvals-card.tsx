import type { ScriptApprovalEntry } from "@/lib/script/queries";
import { formatDateTime } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ApprovalsCard({ approvals }: { approvals: ScriptApprovalEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Script approvals</CardTitle>
        <CardDescription>Immutable history. A new decision is a new row.</CardDescription>
      </CardHeader>
      <CardContent>
        {approvals.length === 0 ? (
          <p className="text-muted-foreground text-sm">No approval decisions yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {approvals.map((a) => (
              <li key={a.id} className="space-y-1 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      a.decision === "approved"
                        ? "bg-emerald-600 text-white"
                        : "bg-orange-500 text-white"
                    }
                  >
                    {a.decision === "approved" ? "Approved" : "Changes requested"}
                  </Badge>
                  <span className="font-mono">V{a.version_no ?? "?"}</span>
                  <span className="text-muted-foreground text-xs">
                    {a.approver_name ?? "—"} · {formatDateTime(a.created_at)}
                  </span>
                </div>
                {a.reason ? (
                  <p className="text-muted-foreground border-l-2 pl-2 text-xs">{a.reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
