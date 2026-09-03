import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/access.server";
import { createClient } from "@/lib/supabase/server";
import { getReviewsTab } from "@/lib/review/queries";
import { getProductionTab } from "@/lib/production/queries";
import { getScriptTab } from "@/lib/script/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PriorityBadge } from "@/components/content/priority-badge";
import { CreativeEvaluationPanel } from "@/components/reviews/creative-evaluation-panel";
import { DmDecision } from "@/components/reviews/dm-decision";
import { ChangeRequestList, DmReviewHistory } from "@/components/reviews/review-history";

export const metadata = { title: "DM / Brand Review" };

function formatBytes(n: number | null | undefined) {
  if (n == null) return null;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DmReviewDetailPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  await requirePermission("dm.review");
  const { contentId: code } = await params;
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("content_records")
    .select(
      "id, content_id, title, region_code, priority, status_key, hook, core_message, cta, target_audience, audience_takeaway, objective_id, content_review_required, current_creative_version_id, current_script_version_id, approved_script_version_id",
    )
    .eq("content_id", code)
    .maybeSingle();
  if (!record) notFound();

  const [reviews, production, script, { data: status }, { data: objective }, { data: diffs }] =
    await Promise.all([
      getReviewsTab(record.id, record.current_creative_version_id),
      getProductionTab(record.id, record.current_creative_version_id),
      getScriptTab(record.id, record.current_script_version_id, record.approved_script_version_id),
      supabase.from("workflow_statuses").select("name").eq("key", record.status_key).maybeSingle(),
      record.objective_id
        ? supabase.from("objectives").select("name").eq("id", record.objective_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("content_differentiators")
        .select("differentiators(name)")
        .eq("content_id", record.id),
    ]);

  const current = production.current;
  const awaiting = record.status_key === "dm_review";
  const differentiators = (diffs ?? [])
    .map((d) => (d.differentiators as { name?: string } | null)?.name)
    .filter((x): x is string => !!x);
  const openFlags = reviews.gate?.open_hard_flag_count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reviews/dm"
          className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeft className="size-3.5" /> DM review queue
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

      {!awaiting ? (
        <Alert>
          <AlertTitle>Not awaiting DM review</AlertTitle>
          <AlertDescription>
            Current stage: {status?.name ?? record.status_key}. Decisions are only possible while
            the record is in DM / Brand Review.
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
                    {current.duration_s != null
                      ? ` · ${Number(current.duration_s).toFixed(0)}s`
                      : ""}
                    {formatBytes(current.size_bytes) ? ` · ${formatBytes(current.size_bytes)}` : ""}
                    {current.uploader_name ? ` · ${current.uploader_name}` : ""}
                  </>
                ) : (
                  "No creative version uploaded yet."
                )}
              </CardDescription>
            </CardHeader>
            {current ? (
              <CardContent>
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
                {current.note ? (
                  <p className="text-muted-foreground mt-2 text-sm">Note: {current.note}</p>
                ) : null}
              </CardContent>
            ) : null}
          </Card>

          <CreativeEvaluationPanel
            evaluation={reviews.latest}
            creativeVersionId={current?.id ?? null}
            creativeVersionNo={current?.version_no ?? null}
            contentCode={record.content_id}
            canAct
          />
        </div>

        <div className="space-y-6 lg:col-span-2">
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
              <CardDescription>
                From Idea &amp; Concept; judge whether production followed it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 text-sm">
                <ConceptRow label="Hook" value={record.hook} />
                <ConceptRow label="Core message" value={record.core_message} />
                <ConceptRow label="CTA" value={record.cta} />
                <ConceptRow label="Target audience" value={record.target_audience} />
                <ConceptRow label="Audience takeaway" value={record.audience_takeaway} />
                <ConceptRow label="Objective" value={objective?.name ?? null} />
                <ConceptRow
                  label="Differentiators"
                  value={differentiators.length ? differentiators.join(", ") : null}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Decision</CardTitle>
              <CardDescription>
                Approve moves the record on; Request changes routes each item to the right team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {awaiting ? (
                <DmDecision
                  contentId={record.id}
                  contentCode={record.content_id}
                  checklist={reviews.checklist}
                  people={production.people}
                  contentReviewRequired={record.content_review_required}
                  openFlagCount={openFlags}
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  No decision available at this stage ({status?.name ?? record.status_key}).
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DmReviewHistory reviews={reviews.dmReviews} />
        <ChangeRequestList requests={reviews.changeRequests} />
      </div>
    </div>
  );
}

function ConceptRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words whitespace-pre-wrap">
        {value ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
