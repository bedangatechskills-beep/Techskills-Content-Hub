import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VERDICT: Record<string, { label: string; className: string }> = {
  ready: {
    label: "Ready",
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  minor_issues: {
    label: "Minor issues",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  },
  significant_issues: {
    label: "Significant issues",
    className: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  },
};

export function VerdictBadge({ verdict }: { verdict: string | null | undefined }) {
  if (!verdict) return null;
  const v = VERDICT[verdict] ?? { label: verdict, className: "" };
  return <Badge className={cn(v.className)}>{v.label}</Badge>;
}

/** Score + verdict + flag count, or "No AI check". */
export function AiSummary({
  score,
  verdict,
  flagCount,
}: {
  score: number | null | undefined;
  verdict: string | null | undefined;
  flagCount: number | null | undefined;
}) {
  if (score == null && !verdict)
    return <span className="text-muted-foreground text-xs">No AI check</span>;
  const flags = flagCount ?? 0;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm font-medium tabular-nums">
        {score != null ? `${Number(score).toFixed(1)}/10` : "—"}
      </span>
      <VerdictBadge verdict={verdict} />
      <span
        className={cn(
          "text-xs",
          flags > 0 ? "font-medium text-red-700 dark:text-red-400" : "text-muted-foreground",
        )}
      >
        {flags} flag{flags === 1 ? "" : "s"}
      </span>
    </div>
  );
}
