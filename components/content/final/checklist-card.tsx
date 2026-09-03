"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import type { Checklist } from "@/lib/final/queries";
import {
  completeContentReview,
  recordDmOverride,
  submitForFinalApproval,
} from "@/lib/final/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReasonDialog } from "@/components/content/script/reason-dialog";

export function ChecklistCard({
  contentId,
  code,
  statusKey,
  contentReviewRequired,
  checklist,
  canSubmit,
  canOverride,
}: {
  contentId: string;
  code: string;
  statusKey: string;
  contentReviewRequired: boolean;
  checklist: Checklist | null;
  /** dm.review */
  canSubmit: boolean;
  /** review.override_threshold */
  canOverride: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState<"skip" | "override" | null>(null);

  const summary = checklist?.reviewer_summary ?? null;
  const failing = (checklist?.items ?? []).filter((i) => !i.ok);
  const needsOverride =
    contentReviewRequired &&
    !!summary &&
    !summary.override &&
    (!summary.meets_quorum || !summary.meets_threshold || summary.against > 0);

  function submit() {
    start(async () => {
      const r = await submitForFinalApproval(contentId, code);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Submitted");
        router.refresh();
      }
    });
  }
  function complete(skipReason?: string) {
    start(async () => {
      const r = await completeContentReview(contentId, code, skipReason);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Completed");
        setAsking(null);
        router.refresh();
      }
    });
  }
  function override(reason: string) {
    start(async () => {
      const r = await recordDmOverride(contentId, code, reason);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Override recorded");
        setAsking(null);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4" aria-hidden /> Final Approval Checklist
        </CardTitle>
        <CardDescription>
          Computed by the system (§48). Submit for Final Approval is impossible while any row fails;
          the CEO only sees work that has already been checked.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!checklist ? (
          <p className="text-muted-foreground text-sm">Not available.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {checklist.items.map((item) => (
              <li key={item.key} className="flex items-start gap-3 px-3 py-2 text-sm">
                {item.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={item.ok ? "" : "font-medium"}>{item.label}</span>
                    {!item.ok && item.overridable ? (
                      <Badge
                        variant="outline"
                        className="border-amber-500/50 text-amber-700 dark:text-amber-400"
                      >
                        overridable
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground text-xs break-all">{item.detail}</p>
                </div>
                {!item.ok ? (
                  <Link
                    href={`/content/${code}?tab=${item.link}`}
                    className="text-xs whitespace-nowrap underline underline-offset-4"
                  >
                    Fix in {item.link}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {summary && contentReviewRequired ? (
          <p className="text-sm">
            <span
              className={
                summary.meets_quorum
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              }
            >
              {summary.count} of {summary.quorum} responses
            </span>
            {" · "}
            <span
              className={
                summary.meets_threshold
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              }
            >
              average {summary.average ?? "—"} vs threshold {summary.threshold}
            </span>
            {summary.override ? (
              <span className="text-muted-foreground">
                {" "}
                · override recorded ({summary.override.kind.replace("reviewer_", "")})
              </span>
            ) : null}
          </p>
        ) : null}
      </CardContent>

      {(canSubmit &&
        (statusKey === "ready_for_final_approval" || statusKey === "content_review")) ||
      (canOverride && needsOverride) ? (
        <CardFooter className="flex flex-wrap items-center gap-2">
          {canSubmit && statusKey === "ready_for_final_approval" ? (
            <div className="space-y-1">
              <Button disabled={pending || !checklist?.all_ok} onClick={submit}>
                {pending ? "Submitting…" : "Submit for Final Approval"}
              </Button>
              {!checklist?.all_ok ? (
                <p className="text-muted-foreground text-xs">
                  Blocked by: {failing.map((f) => f.label).join("; ")}
                </p>
              ) : null}
            </div>
          ) : null}
          {canSubmit && statusKey === "content_review" ? (
            <Button
              variant={
                summary && (summary.meets_quorum || summary.override) ? "default" : "outline"
              }
              disabled={pending}
              onClick={() =>
                summary && !summary.meets_quorum && !summary.override
                  ? setAsking("skip")
                  : complete()
              }
            >
              {summary && !summary.meets_quorum && !summary.override
                ? "Complete Content Review (skip with reason)…"
                : "Complete Content Review"}
            </Button>
          ) : null}
          {canOverride && needsOverride ? (
            <Button variant="outline" disabled={pending} onClick={() => setAsking("override")}>
              Override…
            </Button>
          ) : null}
        </CardFooter>
      ) : null}

      <ReasonDialog
        open={asking === "skip"}
        onOpenChange={(o) => !o && setAsking(null)}
        title="Skip Content Review"
        description={`Reviewer quorum not met (${summary?.count ?? 0} of ${summary?.quorum ?? 0}). Skipping a stage is logged with your reason.`}
        confirmText="Skip and continue"
        destructive
        pending={pending}
        onConfirm={(reason) => complete(reason)}
      />
      <ReasonDialog
        open={asking === "override"}
        onOpenChange={(o) => !o && setAsking(null)}
        title="Override reviewer quorum / threshold"
        description="The override is stored permanently with your name and the CEO sees it on the final approval screen (§47)."
        confirmText="Record override"
        destructive
        pending={pending}
        onConfirm={(reason) => override(reason)}
      />
    </Card>
  );
}
