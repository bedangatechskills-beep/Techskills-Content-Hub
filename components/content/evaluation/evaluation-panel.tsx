"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, UserCheck } from "lucide-react";
import { resolveAiFlag } from "@/lib/script/actions";
import type { AiEvaluationRow, AiFlagResolutionRow } from "@/lib/supabase/database.types";
import { formatDateTime } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReasonDialog } from "@/components/content/script/reason-dialog";

type Flag = { key: string; severity: string; excerpt?: string; fix: string; needs_human?: boolean };
type Recommendation = { category: string; issue: string; suggested_fix: string };
export type Resolution = AiFlagResolutionRow & { actor_name: string | null };

const VERDICT: Record<string, { label: string; className: string }> = {
  ready: { label: "Ready", className: "bg-emerald-600 text-white" },
  ready_for_dm_review: { label: "Ready for DM review", className: "bg-emerald-600 text-white" },
  minor_issues: { label: "Minor issues", className: "bg-amber-500 text-white" },
  improve_before_review: { label: "Improve before review", className: "bg-amber-500 text-white" },
  significant_issues: {
    label: "Significant issues identified",
    className: "bg-red-600 text-white",
  },
};

const VERDICT_BANNER: Record<string, string> = {
  ready: "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30",
  ready_for_dm_review: "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30",
  minor_issues: "border-amber-500/40 bg-amber-50 dark:bg-amber-950/30",
  improve_before_review: "border-amber-500/40 bg-amber-50 dark:bg-amber-950/30",
  significant_issues: "border-red-500/40 bg-red-50 dark:bg-red-950/30",
};

const SEVERITY: Record<string, string> = {
  critical: "border-red-600 bg-red-600 text-white",
  high: "border-red-500/50 text-red-700 dark:text-red-400",
  medium: "border-amber-500/50 text-amber-700 dark:text-amber-400",
  low: "border-zinc-400/50 text-zinc-700 dark:text-zinc-300",
};

export function EvaluationPanel({
  evaluation,
  resolutions,
  categories,
  categoryLabel,
  flagLabel,
  code,
  canResolve,
  canDismissSynthetic = false,
  requesterName,
}: {
  evaluation: AiEvaluationRow;
  resolutions: Resolution[];
  categories: readonly string[];
  categoryLabel: Record<string, string>;
  flagLabel: Record<string, string>;
  code: string;
  canResolve: boolean;
  canDismissSynthetic?: boolean;
  requesterName?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dismissing, setDismissing] = useState<number | null>(null);

  const flags = (evaluation.hard_flags as Flag[] | null) ?? [];
  const scores = (evaluation.category_scores as Record<string, number> | null) ?? {};
  const recs = (evaluation.recommendations as Recommendation[] | null) ?? [];
  const raw = (evaluation.raw_response as Record<string, unknown> | null) ?? {};
  const group2NotConfigured = raw.group2_status === "not_configured";
  const observed = typeof raw.observed_text === "string" ? raw.observed_text : null;
  const verdict = evaluation.verdict ? VERDICT[evaluation.verdict] : null;
  const openCount = flags.filter((_, i) => !resolutions.some((r) => r.flag_index === i)).length;

  function resolve(index: number, action: "resolved" | "dismissed", reason?: string) {
    start(async () => {
      const r = await resolveAiFlag(evaluation.id, index, action, reason, code);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Saved");
        setDismissing(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "flex flex-wrap items-center gap-4 rounded-md border p-3",
          VERDICT_BANNER[evaluation.verdict ?? ""] ?? "",
        )}
      >
        <p className="text-4xl font-semibold tabular-nums">
          {evaluation.overall_score ?? "—"}
          <span className="text-muted-foreground text-base font-normal"> / 10</span>
        </p>
        <div className="space-y-1">
          {verdict ? <Badge className={verdict.className}>{verdict.label}</Badge> : null}
          <p className="text-sm">
            {openCount === 0
              ? "No open hard flags."
              : `${openCount} open hard flag${openCount === 1 ? "" : "s"} — resolve or dismiss each before final approval.`}
          </p>
        </div>
        <div className="text-muted-foreground ml-auto text-right text-xs">
          <p>
            {evaluation.provider} · {evaluation.model} · prompt {evaluation.prompt_version}
          </p>
          <p>
            Requested by {requesterName ?? "—"} · {formatDateTime(evaluation.created_at)}
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">
          Hard flags <span className="text-muted-foreground font-normal">({flags.length})</span>
        </h3>
        {flags.length === 0 ? (
          <p className="text-muted-foreground flex items-center gap-1 text-sm">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> None. No objective
            defects detected.
          </p>
        ) : (
          <ul className="space-y-3">
            {flags.map((f, i) => {
              const res = resolutions.find((r) => r.flag_index === i);
              const synthetic = f.key === "synthetic_human_on_proof";
              return (
                <li key={i} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <AlertTriangle
                      className={cn(
                        "size-4",
                        f.severity === "critical" || f.severity === "high"
                          ? "text-red-600"
                          : "text-amber-600",
                      )}
                      aria-hidden
                    />
                    <span className="font-medium">{flagLabel[f.key] ?? f.key}</span>
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
                      {!synthetic || canDismissSynthetic ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => setDismissing(i)}
                        >
                          Dismiss…
                        </Button>
                      ) : (
                        <span className="text-muted-foreground self-center text-xs">
                          Only DM review may dismiss this flag.
                        </span>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {group2NotConfigured ? (
          <p className="text-muted-foreground rounded-md border border-dashed p-2 text-xs">
            Group 2 brand checks (palette, fonts, logo, template): not configured — add palette,
            fonts and logo rules under Reference data → brand facts to switch them on.
          </p>
        ) : null}
      </section>

      {observed ? (
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer">
            Text the model read on the asset
          </summary>
          <pre className="bg-muted mt-2 rounded p-2 font-mono text-xs whitespace-pre-wrap">
            {observed}
          </pre>
        </details>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Category scores</h3>
        <ul className="space-y-1.5">
          {categories.map((k) => {
            const v = typeof scores[k] === "number" ? scores[k] : null;
            return (
              <li
                key={k}
                className="grid grid-cols-[minmax(140px,1fr)_2fr_auto] items-center gap-3 text-sm"
              >
                <span className="text-muted-foreground truncate">{categoryLabel[k] ?? k}</span>
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
                  {categoryLabel[r.category] ?? r.category}
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

      <ReasonDialog
        open={dismissing !== null}
        onOpenChange={(o) => !o && setDismissing(null)}
        title="Dismiss this flag"
        description="Dismissing keeps the flag in history with your reason. Use it when the AI is wrong, not to skip a fix."
        confirmText="Dismiss flag"
        pending={pending}
        onConfirm={(reason) => dismissing !== null && resolve(dismissing, "dismissed", reason)}
      />
    </div>
  );
}
