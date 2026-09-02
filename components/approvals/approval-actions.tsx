"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Undo2 } from "lucide-react";
import { approveScript, requestScriptChanges } from "@/lib/script/actions";
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

interface Props {
  versionId: string;
  versionNo: number;
  contentCode: string;
  size?: "sm" | "default";
}

export function ApprovalActions({ versionId, versionNo, contentCode, size = "sm" }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"approve" | "changes" | null>(null);
  const [reason, setReason] = useState("");

  function approve() {
    start(async () => {
      const r = await approveScript(versionId, contentCode);
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      toast.success(`Script V${versionNo} of ${contentCode} approved`);
      setMode(null);
      router.refresh();
    });
  }

  function requestChanges() {
    if (!reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    start(async () => {
      const r = await requestScriptChanges(versionId, contentCode, reason);
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      toast.success(`Changes requested on ${contentCode}`);
      setMode(null);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size={size} disabled={pending} onClick={() => setMode("approve")}>
        <Check className="size-4" /> Approve
      </Button>
      <Button size={size} variant="outline" disabled={pending} onClick={() => setMode("changes")}>
        <Undo2 className="size-4" /> Request changes…
      </Button>

      <Dialog open={mode === "approve"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Approve V{versionNo} of {contentCode}?
            </DialogTitle>
            <DialogDescription>
              This pins the version for production. Any material change afterwards will come back to
              you for re-approval, and this approval stays in the history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={approve} disabled={pending}>
              {pending ? "Approving…" : `Approve V${versionNo}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "changes"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes on V{versionNo}</DialogTitle>
            <DialogDescription>
              The record returns to Script / Copy. The reason is stored with the decision and shown
              to the author.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`reason-${versionId}`}>Reason (required)</Label>
            <Textarea
              id={`reason-${versionId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="What must change before this script can be approved?"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={requestChanges}
              disabled={pending || !reason.trim()}
            >
              {pending ? "Sending…" : "Request changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
