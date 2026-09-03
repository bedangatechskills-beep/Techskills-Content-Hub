import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireActiveUser } from "@/lib/auth/access.server";
import { can } from "@/lib/permissions/access";
import {
  getActivity,
  getComments,
  getContentByCode,
  getReferenceData,
  getStageHistory,
} from "@/lib/content/queries";
import { RecordHeader } from "@/components/content/record-header";
import { RecordTabs, isTabKey } from "@/components/content/record-tabs";
import {
  ConceptForm,
  ProductionForm,
  RequestForm,
  SettingsForm,
} from "@/components/content/overview-forms";
import { StageHistoryCard } from "@/components/content/stage-history-card";
import { CommentsTab } from "@/components/content/comments-tab";
import { ActivityTab } from "@/components/content/activity-tab";
import { getScriptTab } from "@/lib/script/queries";
import { ScriptTab } from "@/components/content/script/script-tab";
import { ScriptChangedBanner } from "@/components/content/script/script-banner";
import { getProductionTab } from "@/lib/production/queries";
import { ProductionTab } from "@/components/content/production/production-tab";
import { getGateStatus, getReviewsTab } from "@/lib/review/queries";
import { ReviewsTab } from "@/components/content/reviews/reviews-tab";
import { getFinalTab } from "@/lib/final/queries";
import { CreativeChangedBanner } from "@/components/content/final/creative-banner";
import { getPublishingTab } from "@/lib/publishing/queries";
import { PublishingTab } from "@/components/content/publishing/publishing-tab";

export async function generateMetadata({ params }: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await params;
  return { title: contentId };
}

export default async function ContentRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const access = await requireActiveUser();
  const [{ contentId }, { tab }] = await Promise.all([params, searchParams]);
  const detail = await getContentByCode(contentId);
  if (!detail) notFound();

  const active = isTabKey(tab) ? tab : "overview";
  const [
    refData,
    comments,
    activity,
    history,
    script,
    production,
    reviews,
    gate,
    final,
    publishing,
  ] = await Promise.all([
    getReferenceData(),
    getComments(detail.record.id),
    active === "activity" ? getActivity(detail.record.id) : Promise.resolve([]),
    active === "overview" ? getStageHistory(detail.record.id) : Promise.resolve([]),
    getScriptTab(
      detail.record.id,
      detail.record.current_script_version_id,
      detail.record.approved_script_version_id,
    ),
    active === "production"
      ? getProductionTab(detail.record.id, detail.record.current_creative_version_id)
      : Promise.resolve(null),
    active === "production" || active === "reviews"
      ? getReviewsTab(detail.record.id, detail.record.current_creative_version_id)
      : Promise.resolve(null),
    getGateStatus(detail.record.id),
    getFinalTab(
      detail.record.id,
      detail.record.current_creative_version_id,
      detail.record.approved_creative_version_id,
    ),
    active === "publishing" ? getPublishingTab(detail.record.id) : Promise.resolve(null),
  ]);

  const banner = (
    <>
      {script.changedAfterApproval && script.current && script.approved ? (
        <ScriptChangedBanner
          currentNo={script.current.version_no}
          approvedNo={script.approved.version_no}
          isMaterial={script.current.is_material_change}
        />
      ) : null}
      {final.creativeChangedAfterApproval ? (
        <CreativeChangedBanner pending={final.pendingCreativeMaterial} />
      ) : null}
    </>
  );

  const perms = {
    canEditConcept: can(access, "content.edit_concept"),
    canAssignProduction: can(access, "production.assign") || can(access, "content.edit_concept"),
  };

  return (
    <div className="space-y-6">
      <Link
        href="/content"
        className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-3.5" /> All content
      </Link>

      <RecordHeader detail={detail} refData={refData} banner={banner} gate={gate} />

      <RecordTabs
        code={detail.record.content_id}
        active={active}
        counts={{
          comments: comments.length,
          script: script.versions.length,
          ...(gate ? { reviews: gate.open_change_requests + gate.open_hard_flag_count } : {}),
          ...(publishing ? { publishing: publishing.schedules.length } : {}),
          ...(production
            ? {
                production: production.tasks.filter(
                  (t) => t.status === "todo" || t.status === "in_progress",
                ).length,
              }
            : {}),
        }}
      />

      {active === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_minmax(320px,420px)]">
          <div className="space-y-6">
            <RequestForm detail={detail} refData={refData} perms={perms} />
            <ConceptForm detail={detail} refData={refData} perms={perms} />
          </div>
          <div className="space-y-6">
            <ProductionForm detail={detail} refData={refData} perms={perms} />
            <SettingsForm detail={detail} perms={perms} />
            <StageHistoryCard rows={history} />
          </div>
        </div>
      ) : null}

      {active === "script" ? <ScriptTab detail={detail} data={script} access={access} /> : null}
      {active === "production" && production ? (
        <ProductionTab detail={detail} data={production} access={access} reviews={reviews} />
      ) : null}
      {active === "reviews" && reviews ? (
        <ReviewsTab detail={detail} data={reviews} final={final} access={access} />
      ) : null}

      {active === "publishing" && publishing ? (
        <PublishingTab detail={detail} data={publishing} access={access} />
      ) : null}

      {active === "comments" ? (
        <CommentsTab
          contentId={detail.record.id}
          contentCode={detail.record.content_id}
          comments={comments}
          people={refData.people}
          selfId={access.profile.id}
        />
      ) : null}

      {active === "activity" ? <ActivityTab entries={activity} /> : null}
    </div>
  );
}
