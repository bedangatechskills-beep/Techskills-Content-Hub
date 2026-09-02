import Link from "next/link";
import { cn } from "@/lib/utils";

export const TABS = [
  { key: "overview", label: "Overview" },
  { key: "script", label: "Script" },
  { key: "production", label: "Production" },
  { key: "reviews", label: "Reviews" },
  { key: "comments", label: "Comments" },
  { key: "activity", label: "Activity" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

export function isTabKey(v: string | undefined): v is TabKey {
  return !!v && TABS.some((t) => t.key === v);
}

export function RecordTabs({
  code,
  active,
  counts,
}: {
  code: string;
  active: TabKey;
  counts?: Partial<Record<TabKey, number>>;
}) {
  return (
    <nav aria-label="Record sections" className="overflow-x-auto border-b">
      <ul className="flex gap-1">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={`/content/${code}?tab=${t.key}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap",
                  isActive
                    ? "border-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {t.label}
                {counts?.[t.key] != null ? (
                  <span className="bg-muted rounded-full px-1.5 text-[11px] tabular-nums">
                    {counts[t.key]}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
