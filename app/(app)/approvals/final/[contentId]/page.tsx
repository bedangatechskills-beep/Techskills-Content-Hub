import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requirePermission } from "@/lib/auth/access.server";
import { createClient } from "@/lib/supabase/server";
import { getFinalTab } from "@/lib/final/queries";
import { getReviewsTab } from "@/lib/review/queries";
import { getProductionTab } from "@/lib/production/queries";
import { getScriptTab } from "@/lib/script/queries";
import { formatDate, formatDateTime } from "@/lib/workflow/statuses";
import {
  CREATIVE_FLAG_LABEL,
  type CreativeFlag,
  type CreativeFlagKey,
} from "@/lib/ai/creative-schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PriorityBadge } from "@/components/content/priority-badge";
import { StatusPill } from "@/components/content/status-pill";
import { CreativeVerdictBadge, SEVERITY_CLASS } from "@/components/reviews/creative-verdict-badge";
import { FinalDecision } from "@/components/final-approval/final-decision";
import {
  ChecklistRows,
  OVERRIDE_KIND_LABEL,
  ReviewerDecisionBadge,
  TickList,
} from "@/components/final-approval/bits";

export const metadata = { title: "Final approval" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

export default async function FinalApprovalDetailPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const access = await requirePermission("final.approve");
  const { contentId: code } = await params;
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("content_records")
    .select("*")
    .eq("content_id", code)
    .maybeSingle();
  if (!record) notFound();

  const [
    final,
    reviews,
    production,
    script,
    { data: status },
    { data: program },
    { data: campaign },
    { data: objective },
    { data: campus },
    { data: diffs },
  ] = await Promise.all([
    getFinalTab(record.id, record.current_creative_version_id, record.approved_creative_version_id),
    getReviewsTab(record.id, record.current_creative_version_id),
    getProductionTab(record.id, record.current_creative_version_id),
    getScriptTab(record.id, record.current_script_version_id, record.approved_script_version_id),
    supabase
      .from("workflow_statuses")
      .select("name, colour_key")
      .eq("key", record.status_key)
      .maybeSingle(),
    record.program_id
      ? supabase.from("programs").select("name").eq("id", record.program_id).maybeSingle()
      : Promise.resolve({ data: null }),
    record.campaign_id
      ? supabase.from("campaigns").select("name").eq("id", record.campaign_id).maybeSingle()
      : Promise.resolve({ data: null }),
    record.objective_id
      ? supabase.from("objectives").select("name").eq("id", record.objective_id).maybeSingle()
      : Promise.resolve({ data: null }),
    record.campus_id
      ? supabase.from("campuses").select("name").eq("id", record.campus_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("content_differentiators")
      .select("differentiators(name)")
      .eq("content_id", record.id),
  ]);

  const differentiators = (diffs ?? [])
    .map((d) => (d.differentiators as { name?: string } | null)?.name)
    .filter((x): x is string => !!x);
  const creative = production.current;
  const latestEval = reviews.latest;
  const openFlags = reviews.gate?.open_hard_flags ?? [];
  const allFlags = (latestEval?.hard_flags as CreativeFlag[] | null) ?? [];
  const prodPass =
    production.reviews.find(
      (r) => r.decision === "pass" && r.creative_version_id === record.current_creative_version_id,
    ) ?? production.reviews.find((r) => r.decision === "pass");
  const dmApproved =
    reviews.dmReviews.find(
      (r) =>
        r.decision === "approved" && r.creative_version_id === record.current_creative_version_id,
    ) ?? reviews.dmReviews.find((r) => r.decision === "approved");
  const summary = final.summary;
  const checklist = final.checklist;
  const overrideFailures = checklist?.overridable_failures ?? [];
  const againstWithoutOverride =
    !!summary?.required && (summary?.against ?? 0) > 0 && !summary?.override;
  const overrideRequired = overrideFailures.length > 0 || againstWithoutOverride;
  const overrideReasons = [
    ...overrideFailures.map((k) => checklist?.items.find((i) => i.key === k)?.label ?? k),
    ...(againstWithoutOverride
      ? [`${summary?.against} reviewer(s) recommended against approval`]
      : []),
  ];
  const blockingFailures = (checklist?.items ?? [])
    .filter((i) => !i.ok && !i.overridable)
    .map((i) => i.label);
  const awaiting = record.status_key === "final_approval";
  const openChanges = reviews.changeRequests.filter((c) => !c.is_resolved);
  const unresolved: string[] = [
    ...(openChanges.length ? [`${openChanges.length} open change request(s)`] : []),
    ...(openFlags.length ? [`${openFlags.length} open hard flag(s)`] : []),
    ...(record.nepali_verification === "pending" ? ["Nepali verification pending"] : []),
    ...(record.requires_ai_disclosure ? ["AI disclosure required at publish"] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/approvals/final"
          className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Final approval queue
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm">{record.content_id}</span>
          <h1 className="page-title">{record.title}</h1>
          {status ? <StatusPill name={status.name} colourKey={status.colour_key} /> : null}
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
          <AlertTitle>Not awaiting final approval</AlertTitle>
          <AlertDescription>Current stage: {status?.name ?? record.status_key}.</AlertDescription>
        </Alert>
      ) : null}

      {final.overrides.length > 0 ? (
        <Card className="border-amber-500/60 bg-amber-50/60 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle>Overrides made</CardTitle>
            <CardDescription>
              You are seeing this because the DM Manager overrode a reviewer rule. Each override is
              permanent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {final.overrides.map((o) => (
                <li key={o.id} className="text-sm">
                  <span className="font-medium">{OVERRIDE_KIND_LABEL[o.kind] ?? o.kind}</span> by{" "}
                  {o.actor_name ?? "—"} · {formatDateTime(o.created_at)}
                  <blockquote className="text-muted-foreground mt-1 border-l-2 pl-2 whitespace-pre-wrap">
                    {o.reason}
                  </blockquote>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {awaiting && access.profile.is_final_approver ? (
        <Card className="border-brand-blue/40">
          <CardHeader>
            <CardTitle>Your decision</CardTitle>
            <CardDescription>Approve, request changes with a reason, or reject.</CardDescription>
          </CardHeader>
          <CardContent>
            <FinalDecision
              contentId={record.id}
              contentCode={record.content_id}
              overrideRequired={overrideRequired}
              overrideReasons={overrideReasons}
              blockingOk={checklist?.blocking_ok ?? true}
              blockingFailures={blockingFailures}
            />
          </CardContent>
        </Card>
      ) : awaiting ? (
        <Alert>
          <AlertTitle>Read-only</AlertTitle>
          <AlertDescription>
            Your role has the permission but not the Final Approver flag; an administrator controls
            it.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Current creative</CardTitle>
              <CardDescription>
                {creative
                  ? `V${creative.version_no} · ${creative.file_name}${creative.width && creative.height ? ` · ${creative.width} × ${creative.height}` : ""}`
                  : "No review version"}
                {record.approved_creative_version_id &&
                record.approved_creative_version_id !== record.current_creative_version_id
                  ? " · changed after approval"
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {creative?.signed_url ? (
                creative.mime?.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={creative.signed_url}
                    alt={creative.file_name}
                    className="max-h-[70vh] w-auto rounded-md border"
                  />
                ) : creative.mime?.startsWith("video/") ? (
                  <video
                    src={creative.signed_url}
                    controls
                    className="max-h-[70vh] w-full rounded-md border"
                  />
                ) : (
                  <a
                    href={creative.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline"
                  >
                    Open file
                  </a>
                )
              ) : (
                <p className="text-muted-foreground text-sm">No creative uploaded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approved script</CardTitle>
              <CardDescription>
                {script.approved ? `V${script.approved.version_no}` : "No approved script"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {script.approved ? (
                <pre className="bg-muted rounded-md p-3 font-sans text-sm whitespace-pre-wrap">
                  {script.approved.body}
                </pre>
              ) : (
                <p className="text-muted-foreground text-sm">—</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI creative check</CardTitle>
              <CardDescription>Open flags should be none by this stage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestEval ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-semibold tabular-nums">
                      {latestEval.overall_score != null
                        ? Number(latestEval.overall_score).toFixed(1)
                        : "—"}
                      <span className="text-muted-foreground text-sm">/10</span>
                    </span>
                    <CreativeVerdictBadge verdict={latestEval.verdict} />
                    <span
                      className={
                        openFlags.length
                          ? "text-sm font-medium text-red-700 dark:text-red-400"
                          : "text-muted-foreground text-sm"
                      }
                    >
                      {openFlags.length} open of {allFlags.length} flag
                      {allFlags.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {openFlags.length ? (
                    <ul className="space-y-2">
                      {openFlags.map((f) => (
                        <li key={f.index} className="rounded-md border p-2 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              {CREATIVE_FLAG_LABEL[f.key as CreativeFlagKey] ?? f.key}
                            </span>
                            <Badge className={SEVERITY_CLASS[f.severity] ?? ""}>{f.severity}</Badge>
                          </div>
                          <p className="text-muted-foreground mt-1 font-mono text-xs">
                            {f.excerpt}
                          </p>
                          <p className="mt-1 text-xs">{f.fix}</p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {latestEval.summary ? (
                    <p className="text-muted-foreground text-sm">{latestEval.summary}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No creative check on the current version.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Production review</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {prodPass ? (
                  <>
                    <p>
                      Passed by {prodPass.reviewer_name ?? "—"} ·{" "}
                      {formatDateTime(prodPass.created_at)}
                      {prodPass.creative_version_no
                        ? ` · creative V${prodPass.creative_version_no}`
                        : ""}
                    </p>
                    {prodPass.notes ? (
                      <p className="text-muted-foreground mt-1">{prodPass.notes}</p>
                    ) : null}
                    <TickList checklist={prodPass.checklist as Record<string, boolean> | null} />
                  </>
                ) : (
                  <p className="text-muted-foreground">No pass recorded.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>DM / Brand review</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {dmApproved ? (
                  <>
                    <p>
                      Approved by {dmApproved.reviewer_name ?? "—"} ·{" "}
                      {formatDateTime(dmApproved.created_at)}
                      {dmApproved.creative_version_no
                        ? ` · creative V${dmApproved.creative_version_no}`
                        : ""}
                    </p>
                    {dmApproved.feedback ? (
                      <p className="text-muted-foreground mt-1">{dmApproved.feedback}</p>
                    ) : null}
                    <TickList checklist={dmApproved.checklist as Record<string, boolean> | null} />
                  </>
                ) : (
                  <p className="text-muted-foreground">No approval recorded.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reviewer summary</CardTitle>
              <CardDescription>
                {summary?.required
                  ? `${summary.count} of ${summary.quorum} responses · average ${summary.average ?? "—"} vs threshold ${summary.threshold}`
                  : "Content Review was off for this item"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary?.ratings?.length ? (
                <ul className="divide-y">
                  {summary.ratings.map((r) => (
                    <li
                      key={r.id}
                      className={
                        r.decision !== "recommend_approval"
                          ? "rounded bg-amber-50/70 px-2 py-2 text-sm dark:bg-amber-950/20"
                          : "py-2 text-sm"
                      }
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.reviewer_name}</span>
                        <span className="tabular-nums">{Number(r.average).toFixed(2)}/5</span>
                        <ReviewerDecisionBadge decision={r.decision} />
                        <span className="text-muted-foreground text-xs">
                          {formatDateTime(r.created_at)}
                        </span>
                      </div>
                      {r.comment ? <p className="text-muted-foreground mt-1">{r.comment}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No reviewer responses.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Record</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Field label="Program" value={program?.name} />
                <Field label="Campaign" value={campaign?.name} />
                <Field label="Objective" value={objective?.name} />
                <Field label="Campus" value={campus?.name} />
                <Field label="Target audience" value={record.target_audience} />
                <Field label="Planned publish" value={formatDate(record.target_publish_date)} />
                <Field
                  label="Differentiators"
                  value={
                    differentiators.length ? (
                      <span className="flex flex-wrap gap-1">
                        {differentiators.map((d) => (
                          <Badge key={d} variant="secondary">
                            {d}
                          </Badge>
                        ))}
                      </span>
                    ) : null
                  }
                />
                <Field
                  label="Production folder"
                  value={
                    record.production_folder_url ? (
                      <a
                        href={record.production_folder_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 underline"
                      >
                        Open <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : null
                  }
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Concept</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <Field label="Concept" value={record.concept} />
                <Field label="Hook" value={record.hook} />
                <Field label="Core message" value={record.core_message} />
                <Field label="CTA" value={record.cta} />
                <Field label="Audience takeaway" value={record.audience_takeaway} />
              </dl>
            </CardContent>
          </Card>

          <Card className={unresolved.length ? "border-orange-500/50" : ""}>
            <CardHeader>
              <CardTitle>Unresolved issues</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {unresolved.length ? (
                <ul className="list-disc space-y-1 pl-4">
                  {unresolved.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                  {openChanges.map((c) => (
                    <li key={c.id} className="text-muted-foreground">
                      {c.description} ({c.category})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">None.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checklist</CardTitle>
              <CardDescription>
                {checklist?.all_ok ? "All items met" : "Some items are not met"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checklist ? <ChecklistRows items={checklist.items} /> : null}
            </CardContent>
          </Card>

          {final.finalApprovals.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Previous final decisions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {final.finalApprovals.map((f) => (
                    <li key={f.id}>
                      <Badge
                        className={
                          f.decision === "approved"
                            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
                            : f.decision === "rejected"
                              ? "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200"
                              : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                        }
                      >
                        {f.decision.replace("_", " ")}
                      </Badge>{" "}
                      {f.approver_name ?? "—"} · {formatDateTime(f.created_at)}
                      {f.script_version_no ? ` · script V${f.script_version_no}` : ""}
                      {f.creative_version_no ? ` · creative V${f.creative_version_no}` : ""}
                      {f.reason ? <p className="text-muted-foreground mt-1">{f.reason}</p> : null}
                      {f.override_reason ? (
                        <p className="mt-1 text-amber-800 dark:text-amber-300">
                          Override: {f.override_reason}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
