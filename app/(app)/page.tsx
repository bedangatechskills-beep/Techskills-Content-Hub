import { requireActiveUser } from "@/lib/auth/access.server";
import { can, isFinalApprover } from "@/lib/permissions/access";
import { dashboardVariant, getDashboard } from "@/lib/dashboard/queries";
import {
  ActiveTeam,
  ContentMix,
  DashboardHero,
  GateStat,
  NeedsAttention,
  PipelineBar,
  StatCards,
  UpcomingContent,
  VARIANT_CARDS,
} from "@/components/dashboard/dashboard-view";

export const metadata = { title: "Dashboard" };

// Role dashboards (§84–89). Ten-second rule: cards first, then Needs Attention;
// twenty-second rule for management: pipeline + team below.
export default async function DashboardPage() {
  const access = await requireActiveUser();
  const variant = dashboardVariant(access);
  const data = await getDashboard();
  const manager =
    isFinalApprover(access) ||
    can(access, "dm.review") ||
    can(access, "production.assign") ||
    can(access, "admin.users");

  return (
    <div className="space-y-6">
      <DashboardHero access={access} variant={variant} />
      <StatCards cards={data.cards} defs={VARIANT_CARDS[variant]} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <div className="space-y-6">
          <NeedsAttention rows={data.needsAttention} />
          {manager ? <PipelineBar pipeline={data.pipeline} /> : null}
          {!manager ? <UpcomingContent items={data.upcoming} /> : null}
        </div>
        <div className="space-y-6">
          {manager ? <ActiveTeam team={data.activeTeam} /> : null}
          {manager ? <UpcomingContent items={data.upcoming} /> : null}
          {variant === "ceo" || variant === "dm" ? <GateStat cards={data.cards} /> : null}
          <ContentMix mix={data.mix} />
        </div>
      </div>
    </div>
  );
}
