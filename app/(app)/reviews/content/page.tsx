import { requirePermission } from "@/lib/auth/access.server";
import { getContentReviewQueue } from "@/lib/final/queries";
import { ContentReviewQueueTable } from "@/components/content-review/queue-table";

export const metadata = { title: "Content reviews" };

export default async function ContentReviewQueuePage() {
  await requirePermission("review.rate");
  const rows = await getContentReviewQueue();

  const reReview = rows.filter((r) => r.re_review_required && !r.rated_by_me);
  const waiting = rows.filter((r) => !r.rated_by_me && !r.re_review_required);
  const rated = rows.filter((r) => r.rated_by_me);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Content reviews</h1>
        <p className="text-muted-foreground">
          Rate the current creative on nine categories; your decision is mandatory.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Re-review required ({reReview.length})</h2>
        <p className="text-muted-foreground text-sm">
          A newer creative version arrived after you rated. Rate the current version again.
        </p>
        <ContentReviewQueueTable
          rows={reReview}
          empty="Nothing needs a re-review."
          action="Re-review"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Waiting for my review ({waiting.length})</h2>
        <ContentReviewQueueTable
          rows={waiting}
          empty="Nothing waiting for your review."
          action="Rate"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Rated by me ({rated.length})</h2>
        <ContentReviewQueueTable
          rows={rated}
          empty="You have not rated anything in Content Review."
          action="View"
        />
      </section>
    </div>
  );
}
