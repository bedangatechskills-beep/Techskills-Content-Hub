"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Undo2 } from "lucide-react";
import { moveStage } from "@/lib/content/actions";
import type { ContentDetail } from "@/lib/content/queries";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Transition = ContentDetail["transitions"][number];

export function StageActions({
  contentId,
  transitions,
}: {
  contentId: string;
  transitions: Transition[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState<Transition | null>(null);
  const [reason, setReason] = useState("");

  function run(t: Transition, r?: string) {
    start(async () => {
      const result = await moveStage(contentId, t.to_status, r);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Moved to ${t.to_name}`);
      setAsking(null);
      setReason("");
      router.refresh();
    });
  }

  if (transitions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No moves available to you from this stage.</p>
    );
  }

  const forward = transitions.filter((t) => !t.is_backward);
  const backward = transitions.filter((t) => t.is_backward);

  return (
    <div className="flex flex-wrap gap-2">
      {forward.map((t) => (
        <Button
          key={t.to_status}
          disabled={pending}
          onClick={() => (t.reason_required ? setAsking(t) : run(t))}
        >
          {t.label ?? t.to_name} <ArrowRight className="size-4" />
        </Button>
      ))}
      {backward.map((t) => (
        <Button key={t.to_status} variant="outline" disabled={pending} onClick={() => setAsking(t)}>
          <Undo2 className="size-4" /> {t.label ?? t.to_name}
        </Button>
      ))}

      <Dialog open={!!asking} onOpenChange={(o) => !o && setAsking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{asking?.label ?? asking?.to_name}</DialogTitle>
            <DialogDescription>
              {asking?.is_backward
                ? "Moving content backward needs a reason. It is stored on the activity log for everyone to see."
                : "This move needs a reason. It is stored on the activity log."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="move-reason">Reason</Label>
            <Textarea
              id="move-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder="What needs to change, or why this stage is being skipped"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAsking(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              onClick={() => asking && run(asking, reason)}
              disabled={pending || reason.trim().length === 0}
            >
              {pending ? "Moving…" : `Move to ${asking?.to_name ?? ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
