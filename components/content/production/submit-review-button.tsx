"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { submitForProductionReview } from "@/lib/production/actions";
import { Button } from "@/components/ui/button";

export function SubmitReviewButton({
  contentId,
  code,
  hasCreative,
  hasFolder,
}: {
  contentId: string;
  code: string;
  hasCreative: boolean;
  hasFolder: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const blocked = !hasCreative || !hasFolder;
  const why = !hasCreative
    ? "Upload a review version first."
    : !hasFolder
      ? "Add the production folder link first."
      : null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      <Button
        disabled={pending || blocked}
        onClick={() =>
          start(async () => {
            const r = await submitForProductionReview(contentId, code);
            if (r?.error) toast.error(r.error);
            else {
              toast.success(r?.success ?? "Submitted");
              router.refresh();
            }
          })
        }
      >
        <Send className="size-4" aria-hidden />{" "}
        {pending ? "Submitting…" : "Submit for production review"}
      </Button>
      <p className="text-muted-foreground text-xs">
        {why ?? "Sends the current review version to the production manager."}
      </p>
    </div>
  );
}
