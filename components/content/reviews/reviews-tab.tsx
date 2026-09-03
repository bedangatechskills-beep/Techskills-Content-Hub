import type { ContentDetail } from "@/lib/content/queries";
import type { ReviewsTabData } from "@/lib/review/queries";
import { can, type Access } from "@/lib/permissions/access";
import { GateStatusCard } from "./gate-status-card";
import { ChangeRequestsCard } from "./change-requests-card";
import { RouteBox } from "./route-box";
import { DmReviewHistory } from "./dm-review-history";

export function ReviewsTab({
  detail,
  data,
  access,
}: {
  detail: ContentDetail;
  data: ReviewsTabData;
  access: Access;
}) {
  const { record } = detail;
  const isAssignee =
    !!record.production_assignee_id && record.production_assignee_id === access.profile.id;
  const canRoute = can(access, "production.assign") || can(access, "dm.review") || isAssignee;
  const openCount = data.changeRequests.filter((r) => !r.is_resolved).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="space-y-6">
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
      </div>
      <div className="space-y-6">
        <GateStatusCard gate={data.gate} />
      </div>
    </div>
  );
}
