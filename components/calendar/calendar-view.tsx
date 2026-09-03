import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarItemRow } from "@/lib/supabase/database.types";
import type { CalendarFilters } from "@/lib/calendar/queries";
import {
  addDays,
  addMonths,
  dayLabel,
  monthGrid,
  monthLabel,
  weekDays,
  type IsoDate,
} from "@/lib/calendar/grid";
import type { ReferenceData } from "@/lib/content/queries";
import { statusStyle } from "@/lib/workflow/statuses";
import { selectClass } from "@/components/content/select-field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function hrefFor(view: "month" | "week", date: IsoDate, filters: CalendarFilters) {
  const sp = new URLSearchParams({ view, date });
  for (const [k, v] of Object.entries(filters)) if (v) sp.set(k, v);
  return `/calendar?${sp.toString()}`;
}

function timeOf(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function ItemChip({ item }: { item: CalendarItemRow }) {
  const s = statusStyle(item.colour_key);
  return (
    <Link
      href={`/content/${item.content_code}?tab=publishing`}
      title={`${item.content_code} · ${item.title} · ${item.status_name}`}
      className={cn(
        "block truncate rounded px-1.5 py-0.5 text-[11px] leading-tight hover:ring-2 hover:ring-offset-1",
        s.pill,
        item.kind === "target" && "border border-dashed opacity-80",
      )}
    >
      {item.at_time ? <span className="mr-1 tabular-nums">{timeOf(item.at_time)}</span> : null}
      {item.platform ? <span className="mr-1 font-semibold">{item.platform}</span> : null}
      {item.title}
      {item.requires_ai_disclosure ? (
        <span className="ml-1" aria-label="AI disclosure required">
          ⚠
        </span>
      ) : null}
    </Link>
  );
}

export function CalendarView({
  view,
  date,
  today,
  items,
  filters,
  refData,
  bankDepth,
}: {
  view: "month" | "week";
  date: IsoDate;
  today: IsoDate;
  items: CalendarItemRow[];
  filters: CalendarFilters;
  refData: ReferenceData;
  bankDepth: { ready: number; weeks: number | null };
}) {
  const byDay = new Map<string, CalendarItemRow[]>();
  for (const i of items) {
    if (!i.on_date) continue;
    byDay.set(i.on_date, [...(byDay.get(i.on_date) ?? []), i]);
  }
  const prev = view === "month" ? addMonths(date, -1) : addDays(date, -7);
  const next = view === "month" ? addMonths(date, 1) : addDays(date, 7);
  const days = view === "month" ? monthGrid(date) : [weekDays(date)];
  const month = date.slice(0, 7);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            render={<Link href={hrefFor(view, prev, filters)} aria-label="Previous" />}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            render={<Link href={hrefFor(view, next, filters)} aria-label="Next" />}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={hrefFor(view, today, filters)} />}
          >
            Today
          </Button>
          <h2 className="ml-2 text-lg font-semibold">
            {view === "month" ? monthLabel(date) : `Week of ${dayLabel(weekDays(date)[0])}`}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground text-xs">
            Bank: {bankDepth.ready} ready{bankDepth.weeks != null ? ` ≈ ${bankDepth.weeks} wk` : ""}
          </span>
          <div className="inline-flex rounded-md border p-0.5">
            <Link
              href={hrefFor("month", date, filters)}
              className={cn("rounded px-2 py-1", view === "month" && "bg-muted font-medium")}
            >
              Month
            </Link>
            <Link
              href={hrefFor("week", date, filters)}
              className={cn("rounded px-2 py-1", view === "week" && "bg-muted font-medium")}
            >
              Week
            </Link>
          </div>
        </div>
      </div>

      <form method="get" className="grid gap-2 rounded-md border p-3 sm:grid-cols-3 lg:grid-cols-6">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="date" value={date} />
        <select
          name="program"
          defaultValue={filters.program ?? ""}
          className={selectClass}
          aria-label="Program"
        >
          <option value="">All programs</option>
          {refData.programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          name="campaign"
          defaultValue={filters.campaign ?? ""}
          className={selectClass}
          aria-label="Campaign"
        >
          <option value="">All campaigns</option>
          {refData.campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="platform"
          defaultValue={filters.platform ?? ""}
          className={selectClass}
          aria-label="Platform"
        >
          <option value="">All platforms</option>
          {refData.platforms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          name="format"
          defaultValue={filters.format ?? ""}
          className={selectClass}
          aria-label="Format"
        >
          <option value="">All formats</option>
          {[...new Set(refData.contentTypes.map((t) => t.medium))].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          name="objective"
          defaultValue={filters.objective ?? ""}
          className={selectClass}
          aria-label="Objective"
        >
          <option value="">All objectives</option>
          {refData.objectives.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          name="owner"
          defaultValue={filters.owner ?? ""}
          className={selectClass}
          aria-label="Owner"
        >
          <option value="">Any owner</option>
          {refData.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={filters.status ?? ""}
          className={selectClass}
          aria-label="Status"
        >
          <option value="">Any status</option>
          {refData.statuses.map((s) => (
            <option key={s.key} value={s.key}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="kind"
          defaultValue={filters.kind ?? ""}
          className={selectClass}
          aria-label="Date type"
        >
          <option value="">Scheduled + target + published</option>
          <option value="scheduled">Scheduled only</option>
          <option value="target">Target dates only</option>
          <option value="published">Published only</option>
        </select>
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Apply
          </Button>
          <Button variant="outline" size="sm" render={<Link href={hrefFor(view, date, {})} />}>
            Clear
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-md border">
        <div className="grid min-w-[840px] grid-cols-7 border-b text-xs font-medium">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-muted-foreground px-2 py-1">
              {d}
            </div>
          ))}
        </div>
        {days.map((row, ri) => (
          <div key={ri} className="grid min-w-[840px] grid-cols-7 border-b last:border-0">
            {row.map((d) => {
              const inMonth = view === "week" || d.slice(0, 7) === month;
              const list = byDay.get(d) ?? [];
              return (
                <div
                  key={d}
                  className={cn(
                    "min-h-28 border-r p-1 last:border-0",
                    view === "week" && "min-h-64",
                    !inMonth && "bg-muted/40",
                    d === today && "bg-brand-blue/5",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 text-xs tabular-nums",
                      d === today && "text-brand-blue font-semibold",
                      !inMonth && "text-muted-foreground",
                    )}
                  >
                    {view === "week" ? dayLabel(d) : Number(d.slice(8, 10))}
                  </div>
                  <div className="space-y-0.5">
                    {list.map((i) => (
                      <ItemChip key={`${i.kind}-${i.item_id}`} item={i} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Solid chips are scheduled or published rows; dashed chips are target publish dates not yet
        scheduled. Cards open the record, never a copy.
      </p>
    </div>
  );
}
