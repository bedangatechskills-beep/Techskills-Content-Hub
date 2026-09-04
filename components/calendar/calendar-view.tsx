import Link from "next/link";
import { ChevronLeft, ChevronRight, Filter, ShieldAlert } from "lucide-react";
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
import { selectClass } from "@/components/content/select-field";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/content/status-pill";
import { cn } from "@/lib/utils";

/** Display zone for schedule times; fixed so server and client render the same text. */
export const DISPLAY_TZ = "Australia/Sydney";
const TZ_LABEL = "AEST";

function hrefFor(view: "month" | "week", date: IsoDate, filters: CalendarFilters) {
  const sp = new URLSearchParams({ view, date });
  for (const [k, v] of Object.entries(filters)) if (v) sp.set(k, v);
  return `/calendar?${sp.toString()}`;
}

function timeOf(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: DISPLAY_TZ,
  });
}

const PLATFORM_SHORT: Record<string, string> = {
  Facebook: "FB",
  Instagram: "IG",
  TikTok: "TT",
  LinkedIn: "LI",
  YouTube: "YT",
};

/** One card per record per day; platforms fold into badges. */
interface DayCard {
  key: string;
  kind: string;
  content_code: string;
  title: string;
  status_name: string;
  colour_key: string | null;
  platforms: string[];
  time: string | null;
  disclosure: boolean;
}

function groupByDay(items: CalendarItemRow[]): Map<string, DayCard[]> {
  const days = new Map<string, Map<string, DayCard>>();
  for (const i of items) {
    if (!i.on_date || !i.content_code) continue;
    const byRecord = days.get(i.on_date) ?? new Map<string, DayCard>();
    const key = `${i.kind}-${i.content_id}`;
    const card = byRecord.get(key) ?? {
      key,
      kind: i.kind ?? "target",
      content_code: i.content_code,
      title: i.title ?? "",
      status_name: i.status_name ?? "",
      colour_key: i.colour_key,
      platforms: [],
      time: null,
      disclosure: !!i.requires_ai_disclosure,
    };
    if (i.platform && !card.platforms.includes(i.platform)) card.platforms.push(i.platform);
    if (i.at_time && (!card.time || i.at_time < card.time)) card.time = i.at_time;
    byRecord.set(key, card);
    days.set(i.on_date, byRecord);
  }
  const out = new Map<string, DayCard[]>();
  for (const [d, m] of days) {
    out.set(
      d,
      [...m.values()].sort((a, b) => (a.time ?? "z").localeCompare(b.time ?? "z")),
    );
  }
  return out;
}

const KIND_STYLE: Record<string, { card: string; label: string; dot: string }> = {
  scheduled: {
    card: "border-teal-300 bg-teal-50 text-teal-950 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100",
    label: "Scheduled",
    dot: "bg-teal-500",
  },
  published: {
    card: "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
    label: "Published",
    dot: "bg-emerald-600",
  },
  target: {
    card: "border-dashed border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100",
    label: "Target date (not yet scheduled)",
    dot: "bg-slate-400",
  },
};

function DayCardChip({ card, compact }: { card: DayCard; compact: boolean }) {
  const k = KIND_STYLE[card.kind] ?? KIND_STYLE.target;
  return (
    <Link
      href={`/content/${card.content_code}?tab=publishing`}
      title={`${card.content_code} · ${card.title} · ${card.status_name}${card.platforms.length ? ` · ${card.platforms.join(", ")}` : ""}`}
      className={cn("block rounded-md border px-1.5 py-1 text-[11px] leading-tight", k.card)}
    >
      <div className="flex items-center gap-1">
        {card.time ? (
          <span className="shrink-0 font-semibold tabular-nums">{timeOf(card.time)}</span>
        ) : null}
        {card.platforms.map((p) => (
          <span
            key={p}
            className="rounded bg-white/70 px-1 text-[9px] font-bold tracking-wide dark:bg-black/30"
            aria-label={p}
          >
            {PLATFORM_SHORT[p] ?? p.slice(0, 2).toUpperCase()}
          </span>
        ))}
        {card.disclosure ? (
          <ShieldAlert
            className="ml-auto size-3 shrink-0 text-amber-600"
            aria-label="AI disclosure required"
          />
        ) : null}
      </div>
      <div className={cn("mt-0.5 font-medium", compact ? "line-clamp-2" : "line-clamp-3")}>
        {card.title}
      </div>
      {!compact ? (
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="font-mono text-[10px] opacity-70">{card.content_code}</span>
          <StatusPill name={card.status_name} colourKey={card.colour_key} size="sm" />
        </div>
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
  const byDay = groupByDay(items);
  const prev = view === "month" ? addMonths(date, -1) : addDays(date, -7);
  const next = view === "month" ? addMonths(date, 1) : addDays(date, 7);
  const rows = view === "month" ? monthGrid(date) : [weekDays(date)];
  const month = date.slice(0, 7);
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const MAX_MONTH = 3;
  const totalCards = [...byDay.values()].reduce((a, c) => a + c.length, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
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
          <span className="text-muted-foreground text-xs">
            {totalCards} item{totalCards === 1 ? "" : "s"} · times in {TZ_LABEL}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span
            className="text-muted-foreground text-xs"
            title="Finished-but-unpublished items, in weeks at the last four weeks' publishing rate"
          >
            Bank: {bankDepth.ready} ready
            {bankDepth.weeks != null ? ` ≈ ${bankDepth.weeks} wk` : ""}
          </span>
          <div className="inline-flex rounded-md border p-0.5">
            <Link
              href={hrefFor("month", date, filters)}
              className={cn("rounded px-2.5 py-1", view === "month" && "bg-muted font-medium")}
            >
              Month
            </Link>
            <Link
              href={hrefFor("week", date, filters)}
              className={cn("rounded px-2.5 py-1", view === "week" && "bg-muted font-medium")}
            >
              Week
            </Link>
          </div>
        </div>
      </div>

      {/* Legend + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 text-xs">
          {Object.entries(KIND_STYLE).map(([k, s]) => (
            <li key={k} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block size-2.5 rounded-full",
                  s.dot,
                  k === "target" && "ring-1 ring-slate-400 ring-offset-1",
                )}
                aria-hidden
              />
              {s.label}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <ShieldAlert className="size-3 text-amber-600" aria-hidden /> AI disclosure required
          </li>
        </ul>
        <details className="group w-full lg:w-auto" open={activeFilters > 0}>
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm select-none">
            <Filter className="size-3.5" aria-hidden /> Filters
            {activeFilters ? (
              <span className="bg-brand-blue rounded-full px-1.5 text-[10px] font-semibold text-white">
                {activeFilters}
              </span>
            ) : null}
          </summary>
          <form
            method="get"
            className="bg-card mt-2 grid gap-2 rounded-md border p-3 sm:grid-cols-3 lg:grid-cols-4"
          >
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
              <option value="">Scheduled, target and published</option>
              <option value="scheduled">Scheduled only</option>
              <option value="target">Target dates only</option>
              <option value="published">Published only</option>
            </select>
            <div className="flex gap-2 sm:col-span-3 lg:col-span-4">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Button variant="outline" size="sm" render={<Link href={hrefFor(view, date, {})} />}>
                Clear
              </Button>
            </div>
          </form>
        </details>
      </div>

      {/* Grid */}
      <div className="bg-card overflow-x-auto rounded-lg border shadow-xs">
        <div className="bg-muted/50 grid min-w-[840px] grid-cols-7 border-b text-xs font-semibold">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="text-muted-foreground px-2 py-2 tracking-wide uppercase">
              {d}
            </div>
          ))}
        </div>
        {rows.map((row, ri) => (
          <div key={ri} className="grid min-w-[840px] grid-cols-7 border-b last:border-0">
            {row.map((d) => {
              const inMonth = view === "week" || d.slice(0, 7) === month;
              const list = byDay.get(d) ?? [];
              const shown = view === "month" ? list.slice(0, MAX_MONTH) : list;
              const more = list.length - shown.length;
              const isToday = d === today;
              const isPast = d < today;
              return (
                <div
                  key={d}
                  className={cn(
                    "border-r p-1.5 last:border-0",
                    view === "month" ? "min-h-32" : "min-h-[28rem]",
                    !inMonth && "bg-muted/30",
                    isToday && "bg-brand-blue/5",
                    isPast && inMonth && !isToday && "bg-slate-50/60 dark:bg-slate-900/20",
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                        isToday && "bg-brand-blue font-semibold text-white",
                        !inMonth && "text-muted-foreground",
                      )}
                    >
                      {view === "week" ? dayLabel(d).replace(/,.*$/, "") : Number(d.slice(8, 10))}
                    </span>
                    {view === "week" ? (
                      <span className="text-muted-foreground text-xs">
                        {dayLabel(d).replace(/^[^,]*,\s*/, "")}
                      </span>
                    ) : list.length ? (
                      <span className="text-muted-foreground text-[10px] tabular-nums">
                        {list.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    {shown.map((c) => (
                      <DayCardChip key={c.key} card={c} compact={view === "month"} />
                    ))}
                    {more > 0 ? (
                      <Link
                        href={hrefFor("week", d, filters)}
                        className="text-muted-foreground block px-1 text-[11px] hover:underline"
                      >
                        +{more} more
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {view === "week" && totalCards === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing scheduled or targeted this week. Schedule from a record&apos;s Publishing tab, or
          set a target publish date on its Overview.
        </p>
      ) : null}
    </div>
  );
}
