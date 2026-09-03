"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, Loader2, RefreshCw } from "lucide-react";
import { runAiCreativeCheck } from "@/lib/review/actions";
import type { CreativeEvaluationEntry } from "@/lib/review/queries";
import {
  CREATIVE_CATEGORIES,
  CREATIVE_CATEGORY_LABEL,
  CREATIVE_FLAG_LABEL,
} from "@/lib/ai/creative-schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EvaluationPanel } from "@/components/content/evaluation/evaluation-panel";
import { cn } from "@/lib/utils";

export function CreativeAiCard({
  creativeVersionId,
  versionNo,
  code,
  evaluation,
  canRun,
  canResolve,
  canDismissSynthetic,
}: {
  creativeVersionId: string | null;
  versionNo: number | null;
  code: string;
  evaluation: CreativeEvaluationEntry | null;
  canRun: boolean;
  canResolve: boolean;
  canDismissSynthetic: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(force: boolean) {
    if (!creativeVersionId) return;
    start(async () => {
      const r = await runAiCreativeCheck(creativeVersionId, code, { force });
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Done");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-4" aria-hidden /> AI creative check
              {versionNo != null ? ` — creative V${versionNo}` : ""}
            </CardTitle>
            <CardDescription>
              Defects first, scores second. Advisory only: it never moves the record. The gate
              re-runs automatically on each new version.
            </CardDescription>
          </div>
          {canRun && creativeVersionId ? (
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
                  {pending ? "Checking…" : "Run AI creative check"}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {!creativeVersionId ? (
          <p className="text-muted-foreground text-sm">Upload a review version first.</p>
        ) : !evaluation ? (
          <p className="text-muted-foreground text-sm">No creative check yet on V{versionNo}.</p>
        ) : (
          <EvaluationPanel
            evaluation={evaluation}
            resolutions={evaluation.resolutions}
            categories={CREATIVE_CATEGORIES}
            categoryLabel={CREATIVE_CATEGORY_LABEL}
            flagLabel={CREATIVE_FLAG_LABEL}
            code={code}
            canResolve={canResolve}
            canDismissSynthetic={canDismissSynthetic}
            requesterName={evaluation.requester_name}
          />
        )}
      </CardContent>
    </Card>
  );
}
