import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/access.server";
import { createClient } from "@/lib/supabase/server";
import { getFinalTab } from "@/lib/final/queries";
import { getProductionTab } from "@/lib/production/queries";
import { getReviewsTab } from "@/lib/review/queries";
import { getScriptTab } from "@/lib/script/queries";
import type { ReviewerDecision } from "@/lib/supabase/database.types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PriorityBadge } from "@/components/content/priority-badge";
import { CreativeAiSummary } from "@/components/reviews/creative-verdict-badge";
import { RatingForm } from "@/components/content-review/rating-form";
import { RatingsList } from "@/components/content-review/ratings-list";

export const metadata = { title: "Content review" };

export default async function ContentReviewDetailPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const access = await requirePermission("review.rate");
  const { contentId: code } = await params;
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("content_records")
    .select(
      "id, content_id, title, region_code, priority, status_key, hook, core_message, cta, target_audience, current_creative_version_id, approved_creative_version_id, current_script_version_id, approved_script_version_id, min_reviewer_responses",
    )
    .eq("content_id", code)
    .maybeSingle();
  if (!record) notFound();

  const [production, script, reviews, final, { data: status }] = await Promise.all([
    getProductionTab(record.id, record.current_creative_version_id),
    getScriptTab(record.id, record.current_script_version_id, record.approved_script_version_id),
    getReviewsTab(record.id, record.current_creative_version_id),
    getFinalTab(record.id, record.current_creative_version_id, record.approved_creative_version_id),
    supabase.from("workflow_statuses").select("name").eq("key", record.status_key).maybeSingle(),
  ]);

  const current = production.current;
  const inReview = record.status_key === "content_review";
  const summary = final.summary;
  const quorum = summary?.quorum ?? record.min_reviewer_responses;
  const threshold = summary?.threshold ?? 4;
  const mine = summary?.ratings.find((r) => r.reviewer_id === access.profile.id) ?? null;
  const others = (summary?.ratings ?? []).filter((r) => r.reviewer_id !== access.profile.id);
  const latest = reviews.latest;
  const openFlags = reviews.gate?.open_hard_flag_count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reviews/content"
          className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Content review queue
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm">{record.content_id}</span>
          <h1 className="page-title">{record.title}</h1>
          <PriorityBadge priority={record.priority} />
          <Badge variant="secondary">{record.region_code}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          <Link href={`/content/${record.content_id}?tab=reviews`} className="hover:underline">
            Open the full record
          </Link>
        </p>
      </div>

      {!inReview ? (
        <Alert>
          <AlertTitle>Not in Content Review</AlertTitle>
          <AlertDescription>
            Current stage: {status?.name ?? record.status_key}. Ratings can only be submitted while
            the record is in Content Review.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Creative {current ? `V${current.version_no}` : ""}</CardTitle>
              <CardDescription>
                {current ? (
                  <>
                    {current.file_name}
                    {current.width && current.height
                      ? ` · ${current.width} × ${current.height}`
                      : ""}
                    {current.uploader_name ? ` · ${current.uploader_name}` : ""}
                  </>
                ) : (
                  "No creative version uploaded yet."
                )}
              </CardDescription>
            </CardHeader>
            {current ? (
              <CardContent className="space-y-3">
                {current.signed_url && current.mime?.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.signed_url}
                    alt={`Creative V${current.version_no}: ${current.file_name}`}
                    className="max-h-[70vh] w-auto max-w-full rounded-md border"
                  />
                ) : current.signed_url && current.mime?.startsWith("video/") ? (
                  <video
                    src={current.signed_url}
                    controls
                    className="max-h-[70vh] w-full rounded-md border"
                  />
                ) : current.signed_url ? (
                  <a
                    href={current.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline"
                  >
                    Open {current.file_name}
                  </a>
                ) : (
                  <p className="text-muted-foreground text-sm">Preview unavailable.</p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">AI creative check:</span>
                  {latest ? (
                    <CreativeAiSummary
                      score={latest.overall_score}
                      verdict={latest.verdict}
                      openFlags={openFlags}
                    />
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      No AI check on this version
                    </span>
                  )}
                </div>
              </CardContent>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approved copy</CardTitle>
              <CardDescription>
                {script.approved
                  ? `Script V${script.approved.version_no} — what the asset should say`
                  : "No approved script"}
              </CardDescription>
            </CardHeader>
            {script.approved ? (
              <CardContent>
                <p className="text-sm break-words whitespace-pre-wrap">{script.approved.body}</p>
              </CardContent>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Concept</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 text-sm">
                <Row label="Hook" value={record.hook} />
                <Row label="Core message" value={record.core_message} />
                <Row label="CTA" value={record.cta} />
                <Row label="Target audience" value={record.target_audience} />
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{mine ? "My rating" : "Rate this creative"}</CardTitle>
              <CardDescription>
                Nine categories, 1–5 each. Quorum {quorum} · threshold {threshold}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inReview ? (
                <RatingForm
                  contentId={record.id}
                  contentCode={record.content_id}
                  categories={final.categories}
                  existing={
                    mine
                      ? {
                          scores: mine.scores,
                          decision: mine.decision as ReviewerDecision,
                          comment: mine.comment,
                        }
                      : null
                  }
                  quorum={quorum}
                  threshold={threshold}
                />
              ) : (
                <p className="text-muted-foreground text-sm">Rating is closed for this stage.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reviewer responses ({summary?.count ?? 0})</CardTitle>
              <CardDescription>
                {summary?.average != null
                  ? `Average ${Number(summary.average).toFixed(2)} / 5 · ${summary.meets_quorum ? "quorum met" : "below quorum"} · ${summary.meets_threshold ? "threshold met" : "below threshold"}`
                  : "No responses on this version yet."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RatingsList ratings={others} threshold={threshold} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}
