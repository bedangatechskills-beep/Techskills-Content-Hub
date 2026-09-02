"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Languages } from "lucide-react";
import { verifyNepali } from "@/lib/script/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "./reason-dialog";

export function NepaliAlert({
  state,
  contentId,
  contentCode,
  canVerify,
}: {
  state: "not_needed" | "pending" | "verified";
  contentId: string;
  contentCode: string;
  canVerify: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  if (state === "not_needed") return null;
  if (state === "verified") {
    return (
      <Badge className="bg-emerald-600 text-white">
        <Languages className="size-3" aria-hidden /> Nepali verified
      </Badge>
    );
  }
  return (
    <Alert className="border-amber-500/50">
      <Languages className="size-4" aria-hidden />
      <AlertTitle>Nepali text pending human verification</AlertTitle>
      <AlertDescription>
        The AI flagged Nepali text. It is never auto-corrected; a named Nepali speaker must confirm
        it.
        {canVerify ? (
          <div className="pt-2">
            <Button size="sm" onClick={() => setOpen(true)} disabled={pending}>
              Mark verified
            </Button>
          </div>
        ) : null}
      </AlertDescription>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Verify the Nepali text"
        description="Confirm the Nepali lines in the current script are correct."
        label="Note"
        required={false}
        confirmText="Mark verified"
        pending={pending}
        onConfirm={(note) =>
          start(async () => {
            const r = await verifyNepali(contentId, contentCode, note || undefined);
            if (r?.error) toast.error(r.error);
            else {
              toast.success(r?.success ?? "Verified");
              setOpen(false);
              router.refresh();
            }
          })
        }
      />
    </Alert>
  );
}
