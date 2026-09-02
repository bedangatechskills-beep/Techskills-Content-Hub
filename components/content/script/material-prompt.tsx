"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markVersionMaterial } from "@/lib/script/actions";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "./reason-dialog";

export function MaterialPrompt({
  versionId,
  versionNo,
  contentCode,
}: {
  versionId: string;
  versionNo: number;
  contentCode: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState<boolean | null>(null);

  function run(isMaterial: boolean, reason: string) {
    start(async () => {
      const r = await markVersionMaterial(versionId, contentCode, isMaterial, reason);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Saved");
        setAsking(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-50/60 p-3 text-sm dark:bg-amber-950/20">
      <p className="font-medium">Is V{versionNo} a material change to the approved script?</p>
      <p className="text-muted-foreground text-xs">
        Material means the hook, core message, CTA, a claim, an offer or major wording changed
        (§29). A material change needs re-approval; the previous approval stays in history.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => setAsking(true)}>
          Material change
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setAsking(false)}>
          Non-material
        </Button>
      </div>
      <ReasonDialog
        open={asking !== null}
        onOpenChange={(o) => !o && setAsking(null)}
        title={
          asking ? `Mark V${versionNo} as a material change` : `Mark V${versionNo} as non-material`
        }
        description={
          asking
            ? "The record returns to Script Approval and the approver is notified."
            : "The approved version stays approved. Say briefly what changed."
        }
        confirmText={asking ? "Mark material and request re-approval" : "Mark non-material"}
        destructive={!!asking}
        pending={pending}
        onConfirm={(reason) => run(!!asking, reason)}
      />
    </div>
  );
}
