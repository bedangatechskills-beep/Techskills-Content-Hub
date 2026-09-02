"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, RotateCcw } from "lucide-react";
import { resolveComment } from "@/lib/content/actions";
import { Button } from "@/components/ui/button";

export function CommentResolveButton({
  commentId,
  contentCode,
  resolved,
}: {
  commentId: string;
  contentCode: string;
  resolved: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await resolveComment(commentId, contentCode, !resolved);
          if (r?.error) toast.error(r.error);
          else router.refresh();
        })
      }
    >
      {resolved ? (
        <>
          <RotateCcw className="size-3" /> Reopen
        </>
      ) : (
        <>
          <Check className="size-3" /> Resolve
        </>
      )}
    </Button>
  );
}
