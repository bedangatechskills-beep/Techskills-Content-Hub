// One reusable colour mapping for the whole app (§60). Never colour alone:
// every use pairs the colour with the status label.
export type ColourKey =
  | "grey"
  | "blue"
  | "lavender"
  | "cyan"
  | "brand_blue"
  | "amber"
  | "orange"
  | "indigo"
  | "purple"
  | "green"
  | "teal"
  | "dark_green"
  | "slate";

export interface StatusStyle {
  /** Pill / badge classes */
  pill: string;
  /** Column header accent bar */
  bar: string;
  /** Soft column background */
  column: string;
}

export const STATUS_STYLES: Record<ColourKey, StatusStyle> = {
  grey: {
    pill: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
    bar: "bg-zinc-400",
    column: "bg-zinc-50 dark:bg-zinc-900/40",
  },
  blue: {
    pill: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
    bar: "bg-sky-500",
    column: "bg-sky-50/60 dark:bg-sky-950/30",
  },
  lavender: {
    pill: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
    bar: "bg-violet-400",
    column: "bg-violet-50/60 dark:bg-violet-950/30",
  },
  cyan: {
    pill: "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-200",
    bar: "bg-cyan-500",
    column: "bg-cyan-50/60 dark:bg-cyan-950/30",
  },
  brand_blue: {
    pill: "bg-blue-600 text-white dark:bg-blue-500",
    bar: "bg-blue-600",
    column: "bg-blue-50/60 dark:bg-blue-950/30",
  },
  amber: {
    pill: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    bar: "bg-amber-500",
    column: "bg-amber-50/60 dark:bg-amber-950/30",
  },
  orange: {
    pill: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
    bar: "bg-orange-500",
    column: "bg-orange-50/60 dark:bg-orange-950/30",
  },
  indigo: {
    pill: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200",
    bar: "bg-indigo-500",
    column: "bg-indigo-50/60 dark:bg-indigo-950/30",
  },
  purple: {
    pill: "bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200",
    bar: "bg-purple-600",
    column: "bg-purple-50/60 dark:bg-purple-950/30",
  },
  green: {
    pill: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
    bar: "bg-emerald-500",
    column: "bg-emerald-50/60 dark:bg-emerald-950/30",
  },
  teal: {
    pill: "bg-teal-100 text-teal-900 dark:bg-teal-900/40 dark:text-teal-200",
    bar: "bg-teal-500",
    column: "bg-teal-50/60 dark:bg-teal-950/30",
  },
  dark_green: {
    pill: "bg-green-700 text-white dark:bg-green-600",
    bar: "bg-green-700",
    column: "bg-green-50/60 dark:bg-green-950/30",
  },
  slate: {
    pill: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    bar: "bg-slate-500",
    column: "bg-slate-50 dark:bg-slate-900/40",
  },
};

export function statusStyle(colourKey: string | null | undefined): StatusStyle {
  return STATUS_STYLES[(colourKey as ColourKey) ?? "grey"] ?? STATUS_STYLES.grey;
}

export const PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

/** Urgent is clearly indicated but never overrides the workflow colour (§95). */
export const PRIORITY_CLASS: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "text-foreground",
  high: "text-amber-700 dark:text-amber-400 font-medium",
  urgent: "text-red-700 dark:text-red-400 font-semibold",
};

/** "4 hrs 26 mins", "2 days 4 hrs", "38 secs" (§69). */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} day${d === 1 ? "" : "s"} ${h} hr${h === 1 ? "" : "s"}`;
  if (h > 0) return `${h} hr${h === 1 ? "" : "s"} ${m} min${m === 1 ? "" : "s"}`;
  if (m > 0) return `${m} min${m === 1 ? "" : "s"}`;
  return `${Math.floor(seconds)} sec${seconds === 1 ? "" : "s"}`;
}

/** "34 min ago", "2 hrs ago", "3 days ago" (§71). */
export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const diff = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return "just now";
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
