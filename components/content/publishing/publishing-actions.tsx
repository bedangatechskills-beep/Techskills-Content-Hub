"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, Undo2 } from "lucide-react";
import { archiveContent, unscheduleContent } from "@/lib/publishing/actions";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/components/content/script/reason-dialog";

export function UnscheduleButton({ contentId, code }: { contentId: string; code: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={pending}>
        <Undo2 className="size-4" aria-hidden /> Unschedule
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Unschedule this content"
        description="It returns to Final Approved. The publisher is told. A reason is required for a backward move."
        confirmText="Unschedule"
        pending={pending}
        onConfirm={(reason) =>
          start(async () => {
            const r = await unscheduleContent(contentId, code, reason);
            if (r?.error) toast.error(r.error);
            else {
              toast.success(r?.success ?? "Unscheduled");
              setOpen(false);
              router.refresh();
            }
          })
        }
      />
    </>
  );
}

export function ArchiveButton({ contentId, code }: { contentId: string; code: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={pending}>
        <Archive className="size-4" aria-hidden /> Archive
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Archive this content"
        description="Archived content is never removed: it stays searchable in the published library and stops counting toward workload."
        confirmText="Archive"
        required={false}
        pending={pending}
        onConfirm={(reason) =>
          start(async () => {
            const r = await archiveContent(contentId, code, reason || undefined);
            if (r?.error) toast.error(r.error);
            else {
              toast.success(r?.success ?? "Archived");
              setOpen(false);
              router.refresh();
            }
          })
        }
      />
    </>
  );
}
