"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markCreativeMaterial } from "@/lib/final/actions";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/components/content/script/reason-dialog";

export function CreativeMaterialPrompt({
  creativeVersionId,
  contentCode,
}: {
  creativeVersionId: string;
  contentCode: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState<boolean | null>(null);

  function run(isMaterial: boolean, reason: string) {
    start(async () => {
      const r = await markCreativeMaterial(creativeVersionId, contentCode, isMaterial, reason);
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
      <p className="font-medium">Is the new creative a material change to what the CEO approved?</p>
      <p className="text-muted-foreground text-xs">
        Material means a different video, a changed visual, main headline, thumbnail, CTA or script
        (§52). A material change goes back to the CEO; the previous approval stays in history.
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
          asking
            ? "Mark the creative change as material"
            : "Mark the creative change as non-material"
        }
        description={
          asking
            ? "The record returns to Final Approval and the CEO is notified."
            : "The approval carries over to the new version. Say briefly what changed."
        }
        confirmText={asking ? "Mark material and request re-approval" : "Mark non-material"}
        destructive={!!asking}
        pending={pending}
        onConfirm={(reason) => run(!!asking, reason)}
      />
    </div>
  );
}
