// Pure date helpers for the calendar (§91). ISO dates (YYYY-MM-DD) in and out;
// weeks start on Monday. No time zones here: on_date already comes from the
// database as a calendar date.

export type IsoDate = string;

export function isoDate(d: Date): IsoDate {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIso(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function addDays(s: IsoDate, n: number): IsoDate {
  const d = parseIso(s);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
}

export function addMonths(s: IsoDate, n: number): IsoDate {
  const d = parseIso(s);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  return isoDate(d);
}

/** Monday of the week containing the date. */
export function startOfWeek(s: IsoDate): IsoDate {
  const d = parseIso(s);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0
  return addDays(s, -dow);
}

export function startOfMonth(s: IsoDate): IsoDate {
  return s.slice(0, 8) + "01";
}

/** 7 ISO dates, Monday to Sunday. */
export function weekDays(s: IsoDate): IsoDate[] {
  const start = startOfWeek(s);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Rows of 7 days covering the whole month, padded with neighbours. */
export function monthGrid(s: IsoDate): IsoDate[][] {
  const first = startOfMonth(s);
  const gridStart = startOfWeek(first);
  const lastDay = addDays(addMonths(first, 1), -1);
  const rows: IsoDate[][] = [];
  let cursor = gridStart;
  while (cursor <= lastDay || rows.length < 4) {
    rows.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  }
  return rows;
}

/** Inclusive range covered by a view, for the database query. */
export function viewRange(view: "month" | "week", s: IsoDate): { from: IsoDate; to: IsoDate } {
  if (view === "week") {
    const days = weekDays(s);
    return { from: days[0], to: days[6] };
  }
  const grid = monthGrid(s);
  return { from: grid[0][0], to: grid[grid.length - 1][6] };
}

export function monthLabel(s: IsoDate): string {
  return parseIso(s).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function dayLabel(s: IsoDate): string {
  return parseIso(s).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Whole weeks of finished-but-unpublished content: the "bank depth" idea from the Calendar note. */
export function bankDepthWeeks(readyCount: number, publishedLast4Weeks: number): number | null {
  if (publishedLast4Weeks <= 0) return null;
  const perWeek = publishedLast4Weeks / 4;
  return Math.round((readyCount / perWeek) * 10) / 10;
}
