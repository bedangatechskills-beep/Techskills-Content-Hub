import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const CREATIVE_VERDICT: Record<string, { label: string; className: string }> = {
  ready_for_dm_review: {
    label: "Ready for DM review",
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  improve_before_review: {
    label: "Improve before review",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  },
  significant_issues: {
    label: "Significant issues",
    className: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  },
};

export function CreativeVerdictBadge({ verdict }: { verdict: string | null | undefined }) {
  if (!verdict) return null;
  const v = CREATIVE_VERDICT[verdict] ?? { label: verdict, className: "" };
  return <Badge className={cn(v.className)}>{v.label}</Badge>;
}

/** Score + verdict + open flag count for the creative gate. */
export function CreativeAiSummary({
  score,
  verdict,
  openFlags,
}: {
  score: number | null | undefined;
  verdict: string | null | undefined;
  openFlags: number | null | undefined;
}) {
  const open = openFlags ?? 0;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm font-medium tabular-nums">
        {score != null ? `${Number(score).toFixed(1)}/10` : "—"}
      </span>
      <CreativeVerdictBadge verdict={verdict} />
      <span
        className={cn(
          "text-xs",
          open > 0 ? "font-medium text-red-700 dark:text-red-400" : "text-muted-foreground",
        )}
      >
        {open} open flag{open === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export const SEVERITY_CLASS: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  medium: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  low: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
};
