"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Plus, ShieldCheck, Trash2, Undo2, XCircle } from "lucide-react";
import { finalApprove, finalReject, finalRequestChanges } from "@/lib/final/actions";
import type { ChangeItemInput } from "@/lib/review/actions";
import type { ChangeCategory } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  contentId: string;
  contentCode: string;
  /** Reviewer quorum / threshold / recommendation not met without an override → override reason required. */
  overrideRequired: boolean;
  overrideReasons: string[];
  blockingOk: boolean;
  blockingFailures: string[];
}

type ItemRow = { description: string; category: ChangeCategory };

const CATEGORY_LABEL: Record<ChangeCategory, string> = {
  production: "Production",
  script_message: "Script / message",
  other: "Other",
};

const selectClass =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

export function FinalDecision({
  contentId,
  contentCode,
  overrideRequired,
  overrideReasons,
  blockingOk,
  blockingFailures,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"approve" | "changes" | "reject" | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);

  function done(msg: string) {
    toast.success(msg);
    setMode(null);
    router.push("/approvals/final");
    router.refresh();
  }

  function approve() {
    if (overrideRequired && !overrideReason.trim()) {
      toast.error("An override reason is required");
      return;
    }
    start(async () => {
      const r = await finalApprove(
        contentId,
        contentCode,
        overrideRequired ? overrideReason : undefined,
      );
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      done(`${contentCode} final approved`);
    });
  }

  function requestChanges() {
    if (!reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    const valid: ChangeItemInput[] = items
      .filter((i) => i.description.trim())
      .map((i) => ({ description: i.description.trim(), category: i.category }));
    start(async () => {
      const r = await finalRequestChanges(contentId, contentCode, reason, valid);
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      done(`Changes requested on ${contentCode}`);
    });
  }

  function reject() {
    if (!reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    start(async () => {
      const r = await finalReject(contentId, contentCode, reason);
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      done(`${contentCode} rejected and archived`);
    });
  }

  return (
    <div className="space-y-3">
      {!blockingOk ? (
        <Alert variant="destructive">
          <AlertTitle>Blocking checklist items are not met</AlertTitle>
          <AlertDescription>
            {blockingFailures.join("; ")}. This should not have reached you — send it back with
            Request changes.
          </AlertDescription>
        </Alert>
      ) : null}
      {overrideRequired ? (
        <Alert>
          <AlertTitle>Approving needs an override reason</AlertTitle>
          <AlertDescription>
            {overrideReasons.join("; ")}. The reason is stored permanently.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending || !blockingOk} onClick={() => setMode("approve")}>
          <ShieldCheck className="size-4" aria-hidden /> Final approve
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => setMode("changes")}>
          <Undo2 className="size-4" aria-hidden /> Request changes…
        </Button>
        <Button variant="destructive" disabled={pending} onClick={() => setMode("reject")}>
          <XCircle className="size-4" aria-hidden /> Reject…
        </Button>
        <Button variant="ghost" render={<Link href={`/content/${contentCode}?tab=comments`} />}>
          <MessageSquare className="size-4" aria-hidden /> Comment
        </Button>
      </div>

      <Dialog open={mode === "approve"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Final approve {contentCode}?</DialogTitle>
            <DialogDescription>
              This records you as approver and pins the exact approved script and current creative
              versions. A material change to either afterwards comes back to you for re-approval,
              and this approval stays in the history.
            </DialogDescription>
          </DialogHeader>
          {overrideRequired ? (
            <div className="space-y-2">
              <Label htmlFor="override-reason">
                Override reason (required, stored permanently)
              </Label>
              <p className="text-muted-foreground text-xs">{overrideReasons.join("; ")}</p>
              <Textarea
                id="override-reason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
                placeholder="Why you are approving despite the reviewer rule"
                autoFocus
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              onClick={approve}
              disabled={pending || (overrideRequired && !overrideReason.trim())}
            >
              {pending ? "Approving…" : "Final approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "changes"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes on {contentCode}</DialogTitle>
            <DialogDescription>
              The record returns to Changes Required. Items route to Production or the DM team by
              category. The reason is stored with your decision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="final-reason">Reason (required)</Label>
              <Textarea
                id="final-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Change items (optional)</Label>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    setItems((xs) => [...xs, { description: "", category: "production" }])
                  }
                >
                  <Plus className="size-3" aria-hidden /> Add item
                </Button>
              </div>
              {items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    aria-label={`Change item ${i + 1}`}
                    value={it.description}
                    onChange={(e) =>
                      setItems((xs) =>
                        xs.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)),
                      )
                    }
                    placeholder="What must change"
                  />
                  <select
                    aria-label={`Category ${i + 1}`}
                    className={selectClass + " w-40"}
                    value={it.category}
                    onChange={(e) =>
                      setItems((xs) =>
                        xs.map((x, j) =>
                          j === i ? { ...x, category: e.target.value as ChangeCategory } : x,
                        ),
                      )
                    }
                  >
                    {(Object.keys(CATEGORY_LABEL) as ChangeCategory[]).map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remove item"
                    onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
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

      <Dialog open={mode === "reject"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {contentCode}?</DialogTitle>
            <DialogDescription>
              The record is archived with your reason. Its history, versions and approvals are kept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason (required)</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={reject} disabled={pending || !reason.trim()}>
              {pending ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
