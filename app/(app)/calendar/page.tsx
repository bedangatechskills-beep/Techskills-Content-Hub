import { requireActiveUser } from "@/lib/auth/access.server";
import { getReferenceData } from "@/lib/content/queries";
import { getBankDepth, getCalendarItems, type CalendarFilters } from "@/lib/calendar/queries";
import { bankDepthWeeks, isoDate } from "@/lib/calendar/grid";
import { CalendarView } from "@/components/calendar/calendar-view";

export const metadata = { title: "Calendar" };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

// Month and week views (§91), driven by target publish date and schedule rows.
export default async function CalendarPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireActiveUser();
  const sp = await searchParams;
  const view = one(sp.view) === "week" ? "week" : "month";
  const today = isoDate(new Date());
  const date = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.date) ?? "") ? (one(sp.date) as string) : today;
  const filters: CalendarFilters = {
    program: one(sp.program),
    campaign: one(sp.campaign),
    platform: one(sp.platform),
    format: one(sp.format),
    objective: one(sp.objective),
    owner: one(sp.owner),
    status: one(sp.status),
    region: one(sp.region),
    kind: one(sp.kind),
  };
  const [{ items }, refData, bank] = await Promise.all([
    getCalendarItems(view, date, filters),
    getReferenceData(),
    getBankDepth(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Calendar</h1>
        <p className="text-muted-foreground">
          Scheduled rows per platform, target publish dates, and what went live. Cards open the
          record.
        </p>
      </div>
      <CalendarView
        view={view}
        date={date}
        today={today}
        items={items}
        filters={filters}
        refData={refData}
        bankDepth={{
          ready: bank.ready,
          weeks: bankDepthWeeks(bank.ready, bank.publishedLast4Weeks),
        }}
      />
    </div>
  );
}
