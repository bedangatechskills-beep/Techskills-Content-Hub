"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Send, Undo2 } from "lucide-react";
import { approveScript, requestScriptChanges, submitScriptForApproval } from "@/lib/script/actions";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "./reason-dialog";

export function ScriptActions({
  versionId,
  versionNo,
  contentCode,
  statusKey,
  canSubmit,
  canApprove,
  hasEvaluation,
  requireAi,
}: {
  versionId: string;
  versionNo: number;
  contentCode: string;
  statusKey: string;
  canSubmit: boolean;
  canApprove: boolean;
  hasEvaluation: boolean;
  requireAi: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [askingChanges, setAskingChanges] = useState(false);

  function wrap(fn: () => Promise<{ error?: string; success?: string } | null>) {
    start(async () => {
      const r = await fn();
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Done");
        setAskingChanges(false);
        router.refresh();
      }
    });
  }

  const showSubmit = canSubmit && statusKey === "script_copy";
  const showApprove = canApprove && statusKey === "script_approval";
  if (!showSubmit && !showApprove) return null;

  const submitBlocked = requireAi && !hasEvaluation;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      {showSubmit ? (
        <>
          <Button
            disabled={pending || submitBlocked}
            onClick={() => wrap(() => submitScriptForApproval(versionId, contentCode))}
          >
            <Send className="size-4" aria-hidden /> Submit V{versionNo} for approval
          </Button>
          {submitBlocked ? (
            <p className="text-muted-foreground text-xs">
              Run the AI check first. Submission needs a completed check on this version.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Moves the record to Script Approval and notifies the approver.
            </p>
          )}
        </>
      ) : null}
      {showApprove ? (
        <>
          <Button
            disabled={pending}
            onClick={() => wrap(() => approveScript(versionId, contentCode))}
          >
            <CheckCircle2 className="size-4" aria-hidden /> Approve V{versionNo}
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => setAskingChanges(true)}>
            <Undo2 className="size-4" aria-hidden /> Request changes…
          </Button>
          <p className="text-muted-foreground text-xs">
            Approval pins V{versionNo} as the approved script and moves to Ready for Production.
          </p>
          <ReasonDialog
            open={askingChanges}
            onOpenChange={setAskingChanges}
            title={`Request changes on V${versionNo}`}
            description="The record returns to Script / Copy. The author and DM owner are notified with your reason."
            confirmText="Request changes"
            pending={pending}
            onConfirm={(reason) => wrap(() => requestScriptChanges(versionId, contentCode, reason))}
          />
        </>
      ) : null}
    </div>
  );
}
