import type { ContentDetail } from "@/lib/content/queries";
import type { ProductionTabData } from "@/lib/production/queries";
import { can, type Access } from "@/lib/permissions/access";
import { AssignmentCard } from "./assignment-card";
import { FolderCard } from "./folder-card";
import { TasksCard } from "./tasks-card";
import { CreativesCard } from "./creatives-card";
import { SubmitReviewButton } from "./submit-review-button";
import { ProductionReviewCard } from "./production-review-card";
import { ReviewHistory } from "./review-history";
import { CreativeAiCard } from "./creative-ai-card";
import type { ReviewsTabData } from "@/lib/review/queries";

export function ProductionTab({
  detail,
  data,
  access,
  reviews,
}: {
  detail: ContentDetail;
  data: ProductionTabData;
  access: Access;
  reviews: ReviewsTabData | null;
}) {
  const { record } = detail;
  const me = access.profile.id;
  const isAssignee = !!record.production_assignee_id && record.production_assignee_id === me;
  const canAssign = can(access, "production.assign");
  const canReview = can(access, "production.review");
  const canUpdateOwn = can(access, "production.update_own");
  const canDm = can(access, "dm.review") || can(access, "content.edit_concept");
  const canUpload = canAssign || can(access, "dm.review") || (canUpdateOwn && isAssignee);
  const canWorkTasks = canAssign || (canUpdateOwn && isAssignee);
  const canEditFolder = canAssign || canDm || (canUpdateOwn && isAssignee);

  const assigneeName =
    data.assignments.find((a) => !a.unassigned_at && a.role === "production_assignee")
      ?.assignee_name ??
    data.people.find((p) => p.id === record.production_assignee_id)?.full_name ??
    null;
  const managerName =
    data.people.find((p) => p.id === record.production_manager_id)?.full_name ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="space-y-6">
        {record.status_key === "production" && (isAssignee || canAssign) ? (
          <SubmitReviewButton
            contentId={record.id}
            code={record.content_id}
            hasCreative={!!record.current_creative_version_id}
            hasFolder={!!record.production_folder_url}
          />
        ) : null}
        {canReview && record.status_key === "production_review" ? (
          <ProductionReviewCard
            contentId={record.id}
            code={record.content_id}
            checklist={data.checklist}
            current={data.current}
          />
        ) : null}
        <CreativesCard
          contentId={record.id}
          code={record.content_id}
          creatives={data.creatives}
          currentId={record.current_creative_version_id}
          canUpload={canUpload}
        />
        <CreativeAiCard
          queued={reviews?.queued ?? false}
          creativeVersionId={record.current_creative_version_id}
          versionNo={data.current?.version_no ?? null}
          code={record.content_id}
          evaluation={reviews?.latest ?? null}
          canRun={canUpload || canReview}
          canResolve={canUpload || canReview}
          canDismissSynthetic={can(access, "dm.review")}
        />
        <ReviewHistory reviews={data.reviews} checklist={data.checklist} />
      </div>
      <div className="space-y-6">
        <AssignmentCard
          contentId={record.id}
          code={record.content_id}
          assigneeId={record.production_assignee_id}
          assigneeName={assigneeName}
          managerName={managerName}
          people={data.people}
          canAssign={canAssign}
          history={data.assignments}
        />
        <FolderCard
          contentId={record.id}
          code={record.content_id}
          url={record.production_folder_url}
          canEdit={canEditFolder}
        />
        <TasksCard
          contentId={record.id}
          code={record.content_id}
          tasks={data.tasks}
          people={data.people}
          recordAssigneeId={record.production_assignee_id}
          selfId={me}
          canManage={canAssign}
          canWork={canWorkTasks}
        />
      </div>
    </div>
  );
}
