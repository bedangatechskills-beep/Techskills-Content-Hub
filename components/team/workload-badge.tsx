import { cn } from "@/lib/utils";

const STYLE: Record<string, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" },
  normal: { label: "Normal", cls: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200" },
  high: {
    label: "High",
    cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  },
  at_risk: {
    label: "At Risk",
    cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  },
};

/** Workload status = capacity, not quality (§78). Colour plus text, never colour alone. */
export function WorkloadBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const s = STYLE[status ?? "low"] ?? STYLE.low;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        s.cls,
        className,
      )}
    >
      {s.label}
    </span>
  );
}

export function workloadLabel(status: string | null | undefined): string {
  return (STYLE[status ?? "low"] ?? STYLE.low).label;
}

export const WORK_STATUS_LABEL: Record<string, string> = {
  available: "Available",
  working: "Working",
  reviewing: "Reviewing",
  editing: "Editing",
  recording: "Recording",
  meeting: "Meeting",
  waiting_for_feedback: "Waiting for feedback",
  waiting_for_approval: "Waiting for approval",
  deadline_risk: "Deadline risk",
  away: "Away",
  offline: "Offline",
};

export function WorkStatusChip({ status }: { status: string | null | undefined }) {
  const s = status ?? "offline";
  const cls =
    s === "deadline_risk"
      ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
      : s === "away" || s === "offline"
        ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        : s === "available"
          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
          : "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        cls,
      )}
    >
      {WORK_STATUS_LABEL[s] ?? s}
    </span>
  );
}
