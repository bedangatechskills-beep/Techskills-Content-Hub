import { requireActiveUser } from "@/lib/auth/access.server";
import { getDashboard, isManagerView } from "@/lib/dashboard/queries";
import {
  ActiveTeam,
  ContentMix,
  DashboardHeader,
  GateStat,
  NeedsAttention,
  PipelineBar,
  StatCards,
  UpcomingContent,
  VARIANT_CARDS,
  YourQueue,
} from "@/components/dashboard/dashboard-view";

export const metadata = { title: "Dashboard" };

// Role dashboards (§84–89). Ten-second rule: header says how much is waiting,
// cards show the counts, "Your queue" lists the actual items. Twenty-second
// rule for management: pipeline, team and upcoming below.
export default async function DashboardPage() {
  const access = await requireActiveUser();
  const data = await getDashboard(access);
  const manager = isManagerView(data.variant);
  const defs = VARIANT_CARDS[data.variant];
  const needsYou = data.cards[defs[0].key] ?? 0;

  return (
    <div className="space-y-5">
      <DashboardHeader
        access={access}
        variant={data.variant}
        needsYou={needsYou}
        attention={new Set(data.needsAttention.map((r) => r.id)).size}
      />
      <StatCards cards={data.cards} defs={defs} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <div className="space-y-5">
          <YourQueue queue={data.queue} />
          <NeedsAttention rows={data.needsAttention} scoped={!manager} />
          {manager ? <PipelineBar pipeline={data.pipeline} /> : null}
        </div>
        <div className="space-y-5">
          {manager ? <ActiveTeam team={data.activeTeam} /> : null}
          <UpcomingContent items={data.upcoming} />
          {data.variant === "ceo" || data.variant === "dm" ? <GateStat cards={data.cards} /> : null}
          {manager ? <ContentMix mix={data.mix} /> : null}
        </div>
      </div>
    </div>
  );
}
