import type { ContentDetail } from "@/lib/content/queries";
import type { ReviewsTabData } from "@/lib/review/queries";
import type { FinalTabData } from "@/lib/final/queries";
import { can, type Access } from "@/lib/permissions/access";
import { GateStatusCard } from "./gate-status-card";
import { ChangeRequestsCard } from "./change-requests-card";
import { RouteBox } from "./route-box";
import { DmReviewHistory } from "./dm-review-history";
import { ChecklistCard } from "@/components/content/final/checklist-card";
import { ContentReviewSettings } from "@/components/content/final/content-review-settings";
import { ReviewerRatingsCard } from "@/components/content/final/reviewer-ratings-card";
import { OverridesCard } from "@/components/content/final/overrides-card";
import { FinalApprovalsCard } from "@/components/content/final/final-approvals-card";
import { CreativeMaterialPrompt } from "@/components/content/final/creative-material-prompt";

export function ReviewsTab({
  detail,
  data,
  final,
  access,
}: {
  detail: ContentDetail;
  data: ReviewsTabData;
  final: FinalTabData | null;
  access: Access;
}) {
  const { record } = detail;
  const isAssignee =
    !!record.production_assignee_id && record.production_assignee_id === access.profile.id;
  const canRoute = can(access, "production.assign") || can(access, "dm.review") || isAssignee;
  const canClassify =
    can(access, "production.assign") ||
    can(access, "dm.review") ||
    can(access, "production.update_own");
  const openCount = data.changeRequests.filter((r) => !r.is_resolved).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="space-y-6">
        {final?.pendingCreativeMaterial && canClassify && record.current_creative_version_id ? (
          <CreativeMaterialPrompt
            creativeVersionId={record.current_creative_version_id}
            contentCode={record.content_id}
          />
        ) : null}
        {final ? (
          <ChecklistCard
            contentId={record.id}
            code={record.content_id}
            statusKey={record.status_key}
            contentReviewRequired={record.content_review_required}
            checklist={final.checklist}
            canSubmit={can(access, "dm.review")}
            canOverride={can(access, "review.override_threshold")}
          />
        ) : null}
        {final ? (
          <ReviewerRatingsCard
            contentId={record.id}
            code={record.content_id}
            ratings={final.ratings}
            categories={final.categories}
            quorum={record.min_reviewer_responses}
            threshold={final.summary?.threshold ?? null}
            canRate={can(access, "review.rate") && record.status_key === "content_review"}
          />
        ) : null}
        {record.status_key === "changes_required" && canRoute ? (
          <RouteBox
            contentId={record.id}
            code={record.content_id}
            openCount={openCount}
            canRouteToScript={can(access, "script.edit")}
          />
        ) : null}
        <ChangeRequestsCard
          requests={data.changeRequests}
          code={record.content_id}
          canReopen={can(access, "dm.review")}
        />
        <DmReviewHistory reviews={data.dmReviews} evaluations={data.evaluations} />
        {final ? <FinalApprovalsCard approvals={final.finalApprovals} /> : null}
      </div>
      <div className="space-y-6">
        {can(access, "dm.review") ? (
          <ContentReviewSettings
            contentId={record.id}
            code={record.content_id}
            statusKey={record.status_key}
            required={record.content_review_required}
            minResponses={record.min_reviewer_responses}
          />
        ) : null}
        <GateStatusCard gate={data.gate} />
        {final ? <OverridesCard overrides={final.overrides} /> : null}
      </div>
    </div>
  );
}
