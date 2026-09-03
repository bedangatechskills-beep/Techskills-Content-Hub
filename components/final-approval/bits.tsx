import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChecklistItem } from "@/lib/final/queries";

export const OVERRIDE_KIND_LABEL: Record<string, string> = {
  reviewer_quorum: "Reviewer quorum",
  reviewer_threshold: "Reviewer threshold",
  reviewer_recommendation: "Reviewer recommendation",
  hard_flags: "Hard flags",
};

export const REVIEWER_DECISION_LABEL: Record<string, string> = {
  recommend_approval: "Recommend approval",
  recommend_with_changes: "Recommend with changes",
  not_ready: "Not ready",
};

export function ReviewerDecisionBadge({ decision }: { decision: string }) {
  const against = decision !== "recommend_approval";
  return (
    <Badge
      className={cn(
        against
          ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
          : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
      )}
    >
      {REVIEWER_DECISION_LABEL[decision] ?? decision}
    </Badge>
  );
}

export function ChecklistRows({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="divide-y">
      {items.map((i) => (
        <li key={i.key} className="flex items-start gap-2 py-2 text-sm">
          {i.ok ? (
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Met" />
          ) : (
            <X className="mt-0.5 size-4 shrink-0 text-red-600" aria-label="Not met" />
          )}
          <div className="min-w-0">
            <p className={cn("font-medium", !i.ok && "text-red-700 dark:text-red-400")}>
              {i.label}
            </p>
            <p className="text-muted-foreground text-xs break-words">{i.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TickList({ checklist }: { checklist: Record<string, boolean> | null | undefined }) {
  const entries = Object.entries(checklist ?? {});
  if (!entries.length) return null;
  return (
    <ul className="mt-1 flex flex-wrap gap-1">
      {entries.map(([k, v]) => (
        <li
          key={k}
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px]",
            v
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
          )}
        >
          {v ? "✓" : "–"} {k}
        </li>
      ))}
    </ul>
  );
}
