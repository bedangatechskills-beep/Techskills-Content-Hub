import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/workflow/statuses";
import type { ReviewerSummary } from "@/lib/final/queries";
import { cn } from "@/lib/utils";

const DECISION: Record<string, { label: string; className: string }> = {
  recommend_approval: {
    label: "Recommend approval",
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  recommend_with_changes: {
    label: "Recommend with changes",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  },
  not_ready: {
    label: "Not ready",
    className: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  },
};

export function DecisionBadge({ decision }: { decision: string }) {
  const d = DECISION[decision] ?? { label: decision, className: "" };
  return <Badge className={cn(d.className)}>{d.label}</Badge>;
}

export function RatingsList({
  ratings,
  threshold,
}: {
  ratings: ReviewerSummary["ratings"];
  threshold: number;
}) {
  if (!ratings.length) {
    return (
      <p className="text-muted-foreground text-sm">No reviewer responses on this version yet.</p>
    );
  }
  return (
    <ul className="divide-y">
      {ratings.map((r) => (
        <li key={r.id} className="space-y-1 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{r.reviewer_name}</span>
            <span
              className={cn(
                "tabular-nums",
                Number(r.average) < threshold
                  ? "font-medium text-amber-700 dark:text-amber-400"
                  : "",
              )}
            >
              {Number(r.average).toFixed(2)} / 5
            </span>
            <DecisionBadge decision={r.decision} />
            <span className="text-muted-foreground text-xs">{formatDateTime(r.created_at)}</span>
          </div>
          {r.comment ? (
            <p className="text-muted-foreground border-l-2 pl-3 whitespace-pre-wrap">{r.comment}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
