import { Check, X } from "lucide-react";
import type { ProductionReviewEntry } from "@/lib/production/queries";
import { formatDateTime } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ReviewHistory({
  reviews,
  checklist,
}: {
  reviews: ProductionReviewEntry[];
  checklist: string[];
}) {
  if (reviews.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Production review history</CardTitle>
        <CardDescription>Immutable rows; a new decision is a new row.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {reviews.map((r) => {
            const ticks = (r.checklist ?? {}) as Record<string, boolean>;
            const keys = [...new Set([...checklist, ...Object.keys(ticks)])];
            return (
              <li key={r.id} className="space-y-2 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {r.decision === "pass" ? (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Passed</Badge>
                  ) : (
                    <Badge className="bg-orange-500 text-white hover:bg-orange-500">Returned</Badge>
                  )}
                  <span className="font-medium">{r.reviewer_name ?? "Unknown"}</span>
                  {r.creative_version_no != null ? (
                    <span className="text-muted-foreground">
                      · creative V{r.creative_version_no}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground">· {formatDateTime(r.created_at)}</span>
                </div>
                {r.notes ? <p className="italic">“{r.notes}”</p> : null}
                {keys.length ? (
                  <ul className="grid gap-x-4 gap-y-0.5 text-xs sm:grid-cols-2">
                    {keys.map((k) => (
                      <li key={k} className="flex items-center gap-1.5">
                        {ticks[k] ? (
                          <Check className="size-3 text-emerald-600" aria-label="ticked" />
                        ) : (
                          <X className="text-muted-foreground size-3" aria-label="not ticked" />
                        )}
                        <span className={ticks[k] ? "" : "text-muted-foreground"}>{k}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
