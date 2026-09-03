"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, UserRound, X } from "lucide-react";
import { resolveAiFlag } from "@/lib/script/actions";
import {
  CREATIVE_FLAG_LABEL,
  type CreativeFlag,
  type CreativeFlagKey,
} from "@/lib/ai/creative-schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/components/content/script/reason-dialog";
import { SEVERITY_CLASS } from "./creative-verdict-badge";
import { cn } from "@/lib/utils";

export interface FlagResolution {
  flag_index: number;
  action: "resolved" | "dismissed";
  reason: string | null;
  actor_name: string | null;
}

interface Props {
  evaluationId: string;
  contentCode: string;
  flags: CreativeFlag[];
  resolutions: FlagResolution[];
  canAct: boolean;
}

/** Hard flags first (§38 proposal): each with the specific fix, and its resolution state. */
export function CreativeFlags({ evaluationId, contentCode, flags, resolutions, canAct }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dismissing, setDismissing] = useState<number | null>(null);
  const byIndex = new Map(resolutions.map((r) => [r.flag_index, r]));

  function act(index: number, action: "resolved" | "dismissed", reason?: string) {
    start(async () => {
      const r = await resolveAiFlag(evaluationId, index, action, reason, contentCode);
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      toast.success(r?.success ?? "Updated");
      setDismissing(null);
      router.refresh();
    });
  }

  if (flags.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
        <Check className="size-4" aria-hidden /> No hard flags on this version.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {flags.map((f, i) => {
        const res = byIndex.get(i);
        const label = CREATIVE_FLAG_LABEL[f.key as CreativeFlagKey] ?? f.key;
        return (
          <li
            key={i}
            className={cn(
              "rounded-md border p-3",
              res
                ? "bg-muted/40 opacity-80"
                : "border-red-200 bg-red-50/40 dark:border-red-900/50 dark:bg-red-950/20",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle className="size-4 text-red-600" aria-hidden />
              <span className="font-medium">{label}</span>
              <Badge className={cn(SEVERITY_CLASS[f.severity] ?? "")}>{f.severity}</Badge>
              {f.needs_human ? (
                <Badge variant="outline" className="gap-1">
                  <UserRound className="size-3" aria-hidden /> needs a human
                </Badge>
              ) : null}
              <span className="text-muted-foreground font-mono text-xs">#{i + 1}</span>
            </div>
            {f.excerpt ? (
              <blockquote className="bg-background mt-2 rounded border px-2 py-1 font-mono text-xs break-words whitespace-pre-wrap">
                {f.excerpt}
              </blockquote>
            ) : null}
            <p className="mt-2 text-sm">
              <span className="font-medium">Fix:</span> {f.fix}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {res ? (
                <span className="text-muted-foreground">
                  {res.action === "resolved" ? "Resolved" : "Dismissed"}
                  {res.actor_name ? ` by ${res.actor_name}` : ""}
                  {res.reason ? ` — ${res.reason}` : ""}
                </span>
              ) : canAct ? (
                <>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={pending}
                    onClick={() => act(i, "resolved")}
                  >
                    <Check className="size-3" aria-hidden /> Resolve
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setDismissing(i)}
                  >
                    <X className="size-3" aria-hidden /> Dismiss…
                  </Button>
                </>
              ) : (
                <span className="text-muted-foreground">Open</span>
              )}
            </div>
          </li>
        );
      })}
      <ReasonDialog
        open={dismissing !== null}
        onOpenChange={(o) => !o && setDismissing(null)}
        title="Dismiss this flag"
        description="Dismissing records that a person judged the flag not to apply. The reason is stored in the activity log."
        confirmText="Dismiss flag"
        pending={pending}
        onConfirm={(reason) => dismissing !== null && act(dismissing, "dismissed", reason)}
      />
    </ol>
  );
}
