"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ReviewerRatingRow, ReviewerDecision } from "@/lib/supabase/database.types";
import { submitReviewerRating } from "@/lib/final/actions";
import { formatDateTime } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { selectClass } from "@/components/content/select-field";

const DECISION: Record<string, { label: string; cls: string }> = {
  recommend_approval: { label: "Recommend approval", cls: "bg-emerald-600 text-white" },
  recommend_with_changes: { label: "Recommend with changes", cls: "bg-amber-500 text-white" },
  not_ready: { label: "Not ready", cls: "bg-red-600 text-white" },
};

export function ReviewerRatingsCard({
  contentId,
  code,
  ratings,
  categories,
  quorum,
  threshold,
  canRate,
}: {
  contentId: string;
  code: string;
  ratings: (ReviewerRatingRow & { reviewer_name: string | null })[];
  categories: string[];
  quorum: number;
  threshold: number | null;
  /** review.rate and the record is in Content Review */
  canRate: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(categories.map((c) => [c, 4])),
  );
  const [decision, setDecision] = useState<ReviewerDecision>("recommend_approval");
  const [comment, setComment] = useState("");
  const commentRequired = decision !== "recommend_approval";
  const avg =
    categories.length > 0
      ? (categories.reduce((s, c) => s + (scores[c] ?? 0), 0) / categories.length).toFixed(2)
      : "—";

  function submit() {
    start(async () => {
      const r = await submitReviewerRating(contentId, code, scores, decision, comment);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Rating submitted");
        setComment("");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviewer ratings</CardTitle>
        <CardDescription>
          1–5 across nine categories with a mandatory decision (§44–45). Quorum {quorum}; threshold{" "}
          {threshold ?? "—"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ratings.length === 0 ? (
          <p className="text-muted-foreground text-sm">No ratings yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {ratings.map((r) => {
              const d = DECISION[r.decision] ?? { label: r.decision, cls: "" };
              const sc = (r.scores ?? {}) as Record<string, number>;
              return (
                <li key={r.id} className="space-y-2 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.reviewer_name ?? "—"}</span>
                    <span className="font-mono">{Number(r.average).toFixed(2)}/5</span>
                    <Badge className={d.cls}>{d.label}</Badge>
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(r.created_at)}
                    </span>
                  </div>
                  {r.comment ? (
                    <p className="text-muted-foreground border-l-2 pl-2 text-xs">{r.comment}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-1">
                    {categories.map((c) => (
                      <span
                        key={c}
                        className="bg-muted rounded px-1.5 py-0.5 text-[11px]"
                        title={c}
                      >
                        {c}: <span className="font-mono">{sc[c] ?? "—"}</span>
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {canRate ? (
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Your rating (average {avg}/5)</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {categories.map((c, i) => (
                <div key={c} className="space-y-1">
                  <Label htmlFor={`rate-${i}`} className="text-xs">
                    {c}
                  </Label>
                  <select
                    id={`rate-${i}`}
                    className={selectClass}
                    value={scores[c] ?? 4}
                    onChange={(e) => setScores({ ...scores, [c]: Number(e.target.value) })}
                    disabled={pending}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label htmlFor="rate-decision">Decision</Label>
              <select
                id="rate-decision"
                className={selectClass}
                value={decision}
                onChange={(e) => setDecision(e.target.value as ReviewerDecision)}
                disabled={pending}
              >
                <option value="recommend_approval">Recommend approval</option>
                <option value="recommend_with_changes">Recommend with changes</option>
                <option value="not_ready">Not ready</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rate-comment">
                Comment{commentRequired ? " (required)" : " (optional)"}
              </Label>
              <Textarea
                id="rate-comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={pending}
              />
            </div>
            <Button disabled={pending || (commentRequired && !comment.trim())} onClick={submit}>
              {pending ? "Submitting…" : "Submit rating"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
