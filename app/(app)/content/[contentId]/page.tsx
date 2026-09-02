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
import { PlaceholderTab } from "@/components/content/placeholder-tab";
import { CommentsTab } from "@/components/content/comments-tab";
import { ActivityTab } from "@/components/content/activity-tab";

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
  const [refData, comments, activity, history] = await Promise.all([
    getReferenceData(),
    getComments(detail.record.id),
    active === "activity" ? getActivity(detail.record.id) : Promise.resolve([]),
    active === "overview" ? getStageHistory(detail.record.id) : Promise.resolve([]),
  ]);

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

      <RecordHeader detail={detail} refData={refData} />

      <RecordTabs
        code={detail.record.content_id}
        active={active}
        counts={{ comments: comments.length }}
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

      {active === "script" ? (
        <PlaceholderTab
          title="Script / copy"
          phase="Phase 2"
          body="Versioned scripts and copy specs, the AI script score with hard flags, and script approval."
        />
      ) : null}
      {active === "production" ? (
        <PlaceholderTab
          title="Production"
          phase="Phase 3"
          body="Production tasks, assignment by workload, creative version uploads and production review."
        />
      ) : null}
      {active === "reviews" ? (
        <PlaceholderTab
          title="Reviews"
          phase="Phases 4 and 5"
          body="AI creative and brand score, DM review, reviewer ratings with quorum, the final approval checklist and final approval."
        />
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
