import type { ChangeRequestEntry, DmReviewEntry } from "@/lib/review/queries";
import { formatDateTime } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CATEGORY_LABEL: Record<string, string> = {
  production: "Production",
  script_message: "Script / message",
  other: "Other",
};

export function DmReviewHistory({ reviews }: { reviews: DmReviewEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Previous DM reviews ({reviews.length})</CardTitle>
        <CardDescription>Immutable decisions, newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">No DM review yet.</p>
        ) : (
          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-md border p-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {r.decision === "approved" ? (
                    <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                      Approved
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200">
                      Changes requested
                    </Badge>
                  )}
                  <span>{r.reviewer_name ?? "Unknown"}</span>
                  {r.creative_version_no != null ? (
                    <span className="text-muted-foreground">
                      · creative V{r.creative_version_no}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground">· {formatDateTime(r.created_at)}</span>
                </div>
                {r.feedback ? <p className="mt-1 whitespace-pre-wrap">{r.feedback}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ChangeRequestList({ requests }: { requests: ChangeRequestEntry[] }) {
  const open = requests.filter((r) => !r.is_resolved).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Change requests ({open} open of {requests.length})
        </CardTitle>
        <CardDescription>
          Routed by category; resolved on the record&apos;s Reviews tab.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-muted-foreground text-sm">No change requests.</p>
        ) : (
          <ul className="space-y-2">
            {requests.map((c) => (
              <li key={c.id} className="rounded-md border p-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {c.is_resolved ? (
                    <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                      Resolved
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200">
                      Unresolved
                    </Badge>
                  )}
                  <Badge variant="secondary">{CATEGORY_LABEL[c.category] ?? c.category}</Badge>
                  <span className="text-muted-foreground text-xs">Revision {c.revision_no}</span>
                </div>
                <p className="mt-1">{c.description}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Requested by {c.requested_by_name ?? "Unknown"} · {formatDateTime(c.created_at)}
                  {c.assigned_user_name ? ` · assigned to ${c.assigned_user_name}` : ""}
                  {c.assigned_team_name ? ` (${c.assigned_team_name})` : ""}
                  {c.is_resolved && c.resolved_by_name
                    ? ` · resolved by ${c.resolved_by_name}${c.resolution_note ? ` — ${c.resolution_note}` : ""}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
