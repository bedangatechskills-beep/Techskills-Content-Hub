"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Bot, CheckCircle2, Loader2, RefreshCw, UserCheck } from "lucide-react";
import { resolveAiFlag, runAiScriptCheck } from "@/lib/script/actions";
import type { EvaluationWithResolutions } from "@/lib/script/queries";
import {
  HARD_FLAG_LABEL,
  SCRIPT_CATEGORIES,
  SCRIPT_CATEGORY_LABEL,
  type HardFlag,
  type HardFlagKey,
  type ScriptCategory,
} from "@/lib/ai/schemas";
import { formatDateTime } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReasonDialog } from "./reason-dialog";

type Recommendation = { category: string; issue: string; suggested_fix: string };

const VERDICT: Record<string, { label: string; className: string }> = {
  ready: { label: "Ready", className: "bg-emerald-600 text-white" },
  minor_issues: { label: "Minor issues", className: "bg-amber-500 text-white" },
  significant_issues: { label: "Significant issues", className: "bg-red-600 text-white" },
};

const SEVERITY: Record<string, string> = {
  high: "border-red-500/50 text-red-700 dark:text-red-400",
  medium: "border-amber-500/50 text-amber-700 dark:text-amber-400",
  low: "border-zinc-400/50 text-zinc-700 dark:text-zinc-300",
};

export function AiCheckCard({
  versionId,
  versionNo,
  contentCode,
  evaluation,
  canRun,
  canResolve,
  queued = false,
}: {
  versionId: string;
  queued?: boolean;
  versionNo: number;
  contentCode: string;
  evaluation: EvaluationWithResolutions | null;
  canRun: boolean;
  canResolve: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dismissing, setDismissing] = useState<number | null>(null);

  function run(force: boolean) {
    start(async () => {
      const r = await runAiScriptCheck(versionId, contentCode, force);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Done");
        router.refresh();
      }
    });
  }

  function resolve(index: number, action: "resolved" | "dismissed", reason?: string) {
    if (!evaluation) return;
    start(async () => {
      const r = await resolveAiFlag(evaluation.id, index, action, reason, contentCode);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Saved");
        setDismissing(null);
        router.refresh();
      }
    });
  }

  const flags = (evaluation?.hard_flags as HardFlag[] | null) ?? [];
  const scores = (evaluation?.category_scores as Record<string, number> | null) ?? {};
  const recs = (evaluation?.recommendations as Recommendation[] | null) ?? [];
  const verdict = evaluation?.verdict ? VERDICT[evaluation.verdict] : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-4" aria-hidden /> AI script check — V{versionNo}
            </CardTitle>
            <CardDescription>
              Advisory only. It scores and flags; it never approves or moves the record. Text-only
              check, takes a few seconds.
            </CardDescription>
          </div>
          {canRun ? (
            <div className="flex gap-2">
              {evaluation ? (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run(true)}>
                  <RefreshCw className={cn("size-4", pending && "animate-spin")} aria-hidden />{" "}
                  Re-run
                </Button>
              ) : (
                <Button size="sm" disabled={pending} onClick={() => run(false)}>
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Bot className="size-4" aria-hidden />
                  )}
                  {pending ? "Checking…" : "Run AI check"}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!evaluation ? (
          <p className="text-muted-foreground text-sm">
            {queued
              ? "Queued for evaluation — the reviewer session picks it up within a few minutes. Refresh to see the result."
              : `No AI check yet on V${versionNo}.`}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-4xl font-semibold tabular-nums">
                  {evaluation.overall_score ?? "—"}
                  <span className="text-muted-foreground text-base font-normal"> / 10</span>
                </p>
              </div>
              {verdict ? <Badge className={verdict.className}>{verdict.label}</Badge> : null}
              <div className="text-muted-foreground text-xs">
                <p>
                  {evaluation.provider} · {evaluation.model} · prompt {evaluation.prompt_version}
                </p>
                <p>
                  Requested by {evaluation.requester_name ?? "—"} ·{" "}
                  {formatDateTime(evaluation.created_at)}
                </p>
              </div>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">
                Hard flags{" "}
                <span className="text-muted-foreground font-normal">({flags.length})</span>
              </h3>
              {flags.length === 0 ? (
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> None. No legal or
                  factual defects detected.
                </p>
              ) : (
                <ul className="space-y-3">
                  {flags.map((f, i) => {
                    const res = evaluation.resolutions.find((r) => r.flag_index === i);
                    return (
                      <li key={i} className="rounded-md border p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <AlertTriangle className="size-4 text-amber-600" aria-hidden />
                          <span className="font-medium">
                            {HARD_FLAG_LABEL[f.key as HardFlagKey] ?? f.key}
                          </span>
                          <Badge variant="outline" className={SEVERITY[f.severity] ?? ""}>
                            {f.severity}
                          </Badge>
                          {f.needs_human ? (
                            <Badge variant="outline">
                              <UserCheck className="size-3" aria-hidden /> needs human
                            </Badge>
                          ) : null}
                          {res ? (
                            <Badge
                              className={
                                res.action === "resolved"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-zinc-600 text-white"
                              }
                            >
                              {res.action}
                            </Badge>
                          ) : null}
                        </div>
                        {f.excerpt ? (
                          <blockquote className="bg-muted mt-2 rounded px-2 py-1 font-mono text-xs whitespace-pre-wrap">
                            {f.excerpt}
                          </blockquote>
                        ) : null}
                        <p className="mt-2">
                          <span className="text-muted-foreground">Fix: </span>
                          {f.fix}
                        </p>
                        {res ? (
                          <p className="text-muted-foreground mt-2 text-xs">
                            {res.action === "resolved" ? "Resolved" : "Dismissed"} by{" "}
                            {res.actor_name ?? "—"} · {formatDateTime(res.created_at)}
                            {res.reason ? ` — ${res.reason}` : ""}
                          </p>
                        ) : canResolve ? (
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              onClick={() => resolve(i, "resolved")}
                            >
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={pending}
                              onClick={() => setDismissing(i)}
                            >
                              Dismiss…
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">Category scores</h3>
              <ul className="space-y-1.5">
                {SCRIPT_CATEGORIES.map((k: ScriptCategory) => {
                  const v = typeof scores[k] === "number" ? scores[k] : null;
                  return (
                    <li
                      key={k}
                      className="grid grid-cols-[minmax(140px,1fr)_2fr_auto] items-center gap-3 text-sm"
                    >
                      <span className="text-muted-foreground truncate">
                        {SCRIPT_CATEGORY_LABEL[k]}
                      </span>
                      <div className="bg-muted h-2 overflow-hidden rounded" aria-hidden>
                        <div
                          className={cn(
                            "h-full rounded",
                            v == null
                              ? ""
                              : v >= 7
                                ? "bg-emerald-500"
                                : v >= 5
                                  ? "bg-amber-500"
                                  : "bg-red-500",
                          )}
                          style={{ width: `${((v ?? 0) / 10) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums">{v ?? "—"}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            {recs.length ? (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Recommendations</h3>
                <ol className="space-y-2 text-sm">
                  {recs.slice(0, 3).map((r, i) => (
                    <li key={i} className="rounded-md border p-3">
                      <p className="text-muted-foreground text-xs">
                        {SCRIPT_CATEGORY_LABEL[r.category as ScriptCategory] ?? r.category}
                      </p>
                      <p className="font-medium">{r.issue}</p>
                      <p>{r.suggested_fix}</p>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {evaluation.summary ? (
              <p className="text-muted-foreground text-sm">{evaluation.summary}</p>
            ) : null}
          </>
        )}
      </CardContent>

      <ReasonDialog
        open={dismissing !== null}
        onOpenChange={(o) => !o && setDismissing(null)}
        title="Dismiss this flag"
        description="Dismissing keeps the flag in history with your reason. Use it when the AI is wrong, not to skip a fix."
        confirmText="Dismiss flag"
        pending={pending}
        onConfirm={(reason) => dismissing !== null && resolve(dismissing, "dismissed", reason)}
      />
    </Card>
  );
}
