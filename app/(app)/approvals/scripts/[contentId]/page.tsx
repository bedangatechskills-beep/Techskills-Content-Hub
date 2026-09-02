import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/access.server";
import { createClient } from "@/lib/supabase/server";
import { getScriptTab } from "@/lib/script/queries";
import { formatDateTime, timeAgo } from "@/lib/workflow/statuses";
import {
  HARD_FLAG_LABEL,
  SCRIPT_CATEGORY_LABEL,
  type HardFlag,
  type HardFlagKey,
  type ScriptCategory,
} from "@/lib/ai/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PriorityBadge } from "@/components/content/priority-badge";
import { AiSummary } from "@/components/approvals/verdict-badge";
import { ApprovalActions } from "@/components/approvals/approval-actions";

export const metadata = { title: "Script approval" };

type Recommendation = { category: string; issue: string; suggested_fix: string };

export default async function ScriptApprovalDetailPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  await requirePermission("script.approve");
  const { contentId: code } = await params;
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("content_records")
    .select(
      "id, content_id, title, region_code, priority, status_key, hook, core_message, cta, target_audience, audience_takeaway, objective_id, current_script_version_id, approved_script_version_id",
    )
    .eq("content_id", code)
    .maybeSingle();
  if (!record) notFound();

  const [tab, { data: status }, { data: objective }] = await Promise.all([
    getScriptTab(record.id, record.current_script_version_id, record.approved_script_version_id),
    supabase.from("workflow_statuses").select("name").eq("key", record.status_key).maybeSingle(),
    record.objective_id
      ? supabase.from("objectives").select("name").eq("id", record.objective_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const current = tab.current;
  const evaluation = current?.latest_evaluation ?? null;
  const flags = (evaluation?.hard_flags as HardFlag[] | null) ?? [];
  const recommendations = (evaluation?.recommendations as Recommendation[] | null) ?? [];
  const scores = (evaluation?.category_scores as Record<string, number> | null) ?? {};
  const awaiting = record.status_key === "script_approval";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/approvals/scripts"
          className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Approval queue
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm">{record.content_id}</span>
          <h1 className="text-2xl font-semibold">{record.title}</h1>
          <PriorityBadge priority={record.priority} />
          <Badge variant="secondary">{record.region_code}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          <Link href={`/content/${record.content_id}?tab=script`} className="hover:underline">
            Open the full record
          </Link>
        </p>
      </div>

      {!awaiting ? (
        <Alert>
          <AlertTitle>Not awaiting approval</AlertTitle>
          <AlertDescription>Current stage: {status?.name ?? record.status_key}.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,360px)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {current ? `Current script — V${current.version_no}` : "No script version yet"}
              </CardTitle>
              {current ? (
                <CardDescription>
                  {current.author_name ?? "Unknown"} · {formatDateTime(current.created_at)}
                  {current.change_summary ? ` · ${current.change_summary}` : ""}
                  {tab.approved && tab.approved.id !== current.id
                    ? ` · approved version is V${tab.approved.version_no}`
                    : ""}
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {current ? (
                <pre className="bg-muted/40 rounded-md border p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">
                  {current.body}
                </pre>
              ) : (
                <p className="text-muted-foreground text-sm">
                  The author has not written a version.
                </p>
              )}
              {awaiting && current ? (
                <ApprovalActions
                  versionId={current.id}
                  versionNo={current.version_no}
                  contentCode={record.content_id}
                  size="default"
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI script check</CardTitle>
              <CardDescription>
                {evaluation
                  ? `${evaluation.model} · ${evaluation.prompt_version} · ${formatDateTime(evaluation.created_at)}. Advisory only.`
                  : "No evaluation has been run on the current version."}
              </CardDescription>
            </CardHeader>
            {evaluation ? (
              <CardContent className="space-y-5">
                <AiSummary
                  score={evaluation.overall_score}
                  verdict={evaluation.verdict}
                  flagCount={flags.length}
                />
                {evaluation.summary ? <p className="text-sm">{evaluation.summary}</p> : null}

                {flags.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Hard flags</h3>
                    <ul className="space-y-2">
                      {flags.map((f, i) => (
                        <li
                          key={i}
                          className="rounded-md border border-red-200 bg-red-50/60 p-3 text-sm dark:border-red-900/50 dark:bg-red-950/30"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              {HARD_FLAG_LABEL[f.key as HardFlagKey] ?? f.key}
                            </span>
                            <Badge variant="outline">{f.severity}</Badge>
                            {f.needs_human ? (
                              <Badge variant="secondary">needs a human</Badge>
                            ) : null}
                          </div>
                          {f.excerpt ? (
                            <p className="text-muted-foreground mt-1 italic">“{f.excerpt}”</p>
                          ) : null}
                          <p className="mt-1">{f.fix}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">No hard flags.</p>
                )}

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Category scores</h3>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {Object.entries(scores).map(([k, v]) => (
                      <li key={k} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground w-44 shrink-0 text-xs">
                          {SCRIPT_CATEGORY_LABEL[k as ScriptCategory] ?? k}
                        </span>
                        <span className="bg-muted h-2 flex-1 overflow-hidden rounded">
                          <span
                            className="bg-primary block h-full"
                            style={{ width: `${Math.max(0, Math.min(10, v)) * 10}%` }}
                          />
                        </span>
                        <span className="w-8 text-right text-xs tabular-nums">
                          {Number(v).toFixed(1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {recommendations.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Recommendations</h3>
                    <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                      {recommendations.map((r, i) => (
                        <li key={i}>
                          <span className="font-medium">
                            {SCRIPT_CATEGORY_LABEL[r.category as ScriptCategory] ?? r.category}:
                          </span>{" "}
                          {r.issue}{" "}
                          <span className="text-muted-foreground">— {r.suggested_fix}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </CardContent>
            ) : null}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Concept</CardTitle>
              <CardDescription>What the script must deliver.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <Field label="Hook" value={record.hook} />
                <Field label="Core message" value={record.core_message} />
                <Field label="CTA" value={record.cta} />
                <Field label="Target audience" value={record.target_audience} />
                <Field label="Audience takeaway" value={record.audience_takeaway} />
                <Field label="Objective" value={objective?.name ?? null} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Versions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {tab.versions.map((v) => (
                  <li key={v.id} className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-medium">V{v.version_no}</span>{" "}
                      <span className="text-muted-foreground text-xs">
                        {v.author_name ?? "Unknown"} · {timeAgo(v.created_at)}
                      </span>
                      {v.change_summary ? (
                        <div className="text-muted-foreground text-xs">{v.change_summary}</div>
                      ) : null}
                    </div>
                    <Badge variant={v.approval_status === "approved" ? "default" : "outline"}>
                      {v.approval_status.replace("_", " ")}
                    </Badge>
                  </li>
                ))}
                {tab.versions.length === 0 ? (
                  <li className="text-muted-foreground">None yet.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Previous decisions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {tab.approvals.map((a) => (
                  <li key={a.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={a.decision === "approved" ? "default" : "destructive"}>
                        {a.decision === "approved" ? "Approved" : "Changes requested"}
                      </Badge>
                      <span>V{a.version_no ?? "?"}</span>
                      <span className="text-muted-foreground text-xs">
                        {a.approver_name ?? "Unknown"} · {formatDateTime(a.created_at)}
                      </span>
                    </div>
                    {a.reason ? (
                      <p className="text-muted-foreground mt-1 border-l-2 pl-2 text-xs italic">
                        {a.reason}
                      </p>
                    ) : null}
                  </li>
                ))}
                {tab.approvals.length === 0 ? (
                  <li className="text-muted-foreground">No decisions yet.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>{value ?? <span className="text-muted-foreground">not set</span>}</dd>
    </div>
  );
}
