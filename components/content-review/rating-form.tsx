"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { submitReviewerRating } from "@/lib/final/actions";
import type { ReviewerDecision } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const DECISION_LABEL: Record<ReviewerDecision, string> = {
  recommend_approval: "Recommend approval",
  recommend_with_changes: "Recommend with changes",
  not_ready: "Not ready",
};

const selectClass =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

interface Props {
  contentId: string;
  contentCode: string;
  categories: string[];
  existing: {
    scores: Record<string, number>;
    decision: ReviewerDecision;
    comment: string | null;
  } | null;
  quorum: number;
  threshold: number;
}

export function RatingForm({
  contentId,
  contentCode,
  categories,
  existing,
  quorum,
  threshold,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const c of categories) init[c] = existing?.scores?.[c] ?? 0;
    return init;
  });
  const [decision, setDecision] = useState<ReviewerDecision>(
    existing?.decision ?? "recommend_approval",
  );
  const [comment, setComment] = useState(existing?.comment ?? "");

  const rated = categories.filter((c) => scores[c] >= 1);
  const average = useMemo(
    () =>
      rated.length
        ? Math.round((rated.reduce((s, c) => s + scores[c], 0) / rated.length) * 100) / 100
        : null,
    [rated, scores],
  );
  const commentRequired = decision !== "recommend_approval";
  const complete = rated.length === categories.length;
  const canSubmit = complete && (!commentRequired || comment.trim().length > 0) && !pending;

  function submit() {
    start(async () => {
      const r = await submitReviewerRating(
        contentId,
        contentCode,
        scores,
        decision,
        comment.trim() || undefined,
      );
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Rating submitted");
        router.push("/reviews/content");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {categories.map((c) => (
          <fieldset key={c} className="flex items-center justify-between gap-3">
            <legend className="sr-only">{c}</legend>
            <span className="text-sm">{c}</span>
            <div className="flex items-center gap-1" role="radiogroup" aria-label={c}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = scores[c] >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={scores[c] === n}
                    aria-label={`${c}: ${n} of 5`}
                    onClick={() => setScores((s) => ({ ...s, [c]: n }))}
                    className={cn(
                      "rounded p-0.5 transition-colors",
                      active
                        ? "text-brand-orange"
                        : "text-muted-foreground/40 hover:text-muted-foreground",
                    )}
                  >
                    <Star className="size-5" fill={active ? "currentColor" : "none"} aria-hidden />
                  </button>
                );
              })}
              <span className="text-muted-foreground w-5 text-right text-xs tabular-nums">
                {scores[c] || "–"}
              </span>
            </div>
          </fieldset>
        ))}
      </div>

      <div className="flex items-baseline justify-between rounded-md border px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          Average · quorum {quorum} · threshold {threshold}
        </span>
        <span
          className={cn(
            "text-lg font-semibold tabular-nums",
            average != null && average < threshold ? "text-amber-700 dark:text-amber-400" : "",
          )}
        >
          {average != null ? `${average.toFixed(2)} / 5` : "—"}
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rating-decision">Decision</Label>
        <select
          id="rating-decision"
          className={selectClass}
          value={decision}
          onChange={(e) => setDecision(e.target.value as ReviewerDecision)}
        >
          {(Object.keys(DECISION_LABEL) as ReviewerDecision[]).map((d) => (
            <option key={d} value={d}>
              {DECISION_LABEL[d]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rating-comment">
          Comment{" "}
          {commentRequired ? (
            <span className="text-red-700 dark:text-red-400">(required)</span>
          ) : (
            "(optional)"
          )}
        </Label>
        <Textarea
          id="rating-comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            commentRequired
              ? "Required for Recommend with changes and Not ready"
              : "What worked, what to watch"
          }
        />
      </div>

      {!complete ? (
        <p className="text-muted-foreground text-xs">
          Rate all {categories.length} categories to submit.
        </p>
      ) : null}

      <Button onClick={submit} disabled={!canSubmit}>
        {pending ? "Submitting…" : existing ? "Update my rating" : "Submit rating"}
      </Button>
    </div>
  );
}
