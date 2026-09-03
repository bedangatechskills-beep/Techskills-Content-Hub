import { Check, X } from "lucide-react";
import type { CreativeEvaluationEntry, DmReviewEntry } from "@/lib/review/queries";
import { formatDateTime } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const VERDICT_LABEL: Record<string, string> = {
  ready_for_dm_review: "Ready for DM review",
  improve_before_review: "Improve before review",
  significant_issues: "Significant issues",
};

export function DmReviewHistory({
  reviews,
  evaluations,
}: {
  reviews: DmReviewEntry[];
  evaluations: CreativeEvaluationEntry[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>DM / Brand Review history</CardTitle>
        <CardDescription>Immutable decisions. A new decision is a new row.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">No DM review yet.</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => {
              const checklist = (r.checklist as Record<string, boolean> | null) ?? {};
              const ticks = Object.entries(checklist);
              return (
                <li key={r.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={
                        r.decision === "approved"
                          ? "bg-emerald-600 text-white"
                          : "bg-orange-500 text-white"
                      }
                    >
                      {r.decision === "approved" ? "Approved" : "Changes requested"}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {r.reviewer_name ?? "—"}
                      {r.creative_version_no != null
                        ? ` · creative V${r.creative_version_no}`
                        : ""}{" "}
                      · {formatDateTime(r.created_at)}
                    </span>
                  </div>
                  {r.feedback ? <p className="mt-2 whitespace-pre-wrap">{r.feedback}</p> : null}
                  {ticks.length ? (
                    <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                      {ticks.map(([k, v]) => (
                        <li key={k} className="flex items-center gap-1">
                          {v ? (
                            <Check className="size-3 text-emerald-600" aria-hidden />
                          ) : (
                            <X className="text-muted-foreground size-3" aria-hidden />
                          )}
                          {k}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {evaluations.length ? (
          <div>
            <h3 className="mb-2 text-sm font-medium">Creative checks</h3>
            <ul className="space-y-1 text-sm">
              {evaluations.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums">{e.overall_score ?? "—"}/10</span>
                  <Badge variant="outline">{VERDICT_LABEL[e.verdict ?? ""] ?? e.verdict}</Badge>
                  <span className="text-muted-foreground text-xs">
                    {(e.hard_flags as unknown[] | null)?.length ?? 0} flags ·{" "}
                    {formatDateTime(e.created_at)} · {e.model}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
