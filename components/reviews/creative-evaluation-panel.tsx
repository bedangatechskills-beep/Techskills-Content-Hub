import {
  CREATIVE_CATEGORIES,
  CREATIVE_CATEGORY_LABEL,
  type CreativeFlag,
} from "@/lib/ai/creative-schemas";
import type { CreativeEvaluationEntry } from "@/lib/review/queries";
import { formatDateTime } from "@/lib/workflow/statuses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreativeFlags } from "./creative-flags";
import { CreativeVerdictBadge } from "./creative-verdict-badge";
import { RunCreativeCheck } from "./run-creative-check";

type Recommendation = { category: string; issue: string; suggested_fix: string };

interface Props {
  evaluation: CreativeEvaluationEntry | null;
  creativeVersionId: string | null;
  creativeVersionNo: number | null;
  contentCode: string;
  canAct: boolean;
}

/** Verdict, hard flags first, then category bars and recommendations. */
export function CreativeEvaluationPanel({
  evaluation,
  creativeVersionId,
  creativeVersionNo,
  contentCode,
  canAct,
}: Props) {
  if (!creativeVersionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI creative check</CardTitle>
          <CardDescription>No creative version has been uploaded yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!evaluation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI creative check</CardTitle>
          <CardDescription>
            No AI check on creative V{creativeVersionNo ?? "?"} yet. It runs automatically on
            upload; run it here if it did not.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RunCreativeCheck creativeVersionId={creativeVersionId} contentCode={contentCode} />
        </CardContent>
      </Card>
    );
  }

  const flags = (evaluation.hard_flags as unknown as CreativeFlag[] | null) ?? [];
  const scores = (evaluation.category_scores as Record<string, number> | null) ?? {};
  const recommendations = (evaluation.recommendations as unknown as Recommendation[] | null) ?? [];
  const raw = (evaluation.raw_response as Record<string, unknown> | null) ?? {};
  const group2 = raw.group2_status === "not_configured" ? "not_configured" : "checked";
  const imageAttached = raw.image_attached !== false;
  const openCount = flags.filter(
    (_, i) => !evaluation.resolutions.some((r) => r.flag_index === i),
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2">
              AI creative check · V{creativeVersionNo ?? "?"}
              <CreativeVerdictBadge verdict={evaluation.verdict} />
            </CardTitle>
            <CardDescription>
              {evaluation.provider} · {evaluation.model} · {evaluation.prompt_version} ·{" "}
              {evaluation.requester_name ?? "system"} · {formatDateTime(evaluation.created_at)}
              {!imageAttached ? " · asset not attached (metadata only)" : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold tabular-nums">
              {evaluation.overall_score != null ? Number(evaluation.overall_score).toFixed(1) : "—"}
              <span className="text-muted-foreground text-sm font-normal">/10</span>
            </span>
            <RunCreativeCheck
              creativeVersionId={creativeVersionId}
              contentCode={contentCode}
              force
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-semibold">
            Hard flags ({openCount} open of {flags.length})
          </h3>
          <CreativeFlags
            evaluationId={evaluation.id}
            contentCode={contentCode}
            flags={flags}
            resolutions={evaluation.resolutions}
            canAct={canAct}
          />
          {group2 === "not_configured" ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Brand checks (palette, fonts, logo, template) not run: brand facts are not configured
              yet under Reference data.
            </p>
          ) : null}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Category scores</h3>
          <ul className="space-y-1.5">
            {CREATIVE_CATEGORIES.map((k) => {
              const v = typeof scores[k] === "number" ? scores[k] : null;
              return (
                <li key={k} className="grid grid-cols-[160px_1fr_36px] items-center gap-2 text-xs">
                  <span className="truncate">{CREATIVE_CATEGORY_LABEL[k]}</span>
                  <span className="bg-muted h-2 overflow-hidden rounded">
                    <span
                      className="bg-brand-blue block h-2 rounded"
                      style={{ width: `${Math.max(0, Math.min(10, v ?? 0)) * 10}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums">{v != null ? v.toFixed(1) : "—"}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {recommendations.length ? (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Recommendations</h3>
            <ol className="space-y-2">
              {recommendations.slice(0, 3).map((r, i) => (
                <li key={i} className="rounded-md border p-2 text-sm">
                  <Badge variant="secondary" className="mb-1">
                    {CREATIVE_CATEGORY_LABEL[r.category as keyof typeof CREATIVE_CATEGORY_LABEL] ??
                      r.category}
                  </Badge>
                  <p className="font-medium">{r.issue}</p>
                  <p className="text-muted-foreground">{r.suggested_fix}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {evaluation.summary ? (
          <p className="text-muted-foreground text-sm">{evaluation.summary}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
