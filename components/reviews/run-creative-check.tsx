"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { runAiCreativeCheck } from "@/lib/review/actions";
import { Button } from "@/components/ui/button";

export function RunCreativeCheck({
  creativeVersionId,
  contentCode,
  force = false,
  size = "sm",
  label,
}: {
  creativeVersionId: string;
  contentCode: string;
  force?: boolean;
  size?: "sm" | "default" | "xs";
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const r = await runAiCreativeCheck(creativeVersionId, contentCode, { force });
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      toast.success(r?.success ?? "AI creative check complete");
      router.refresh();
    });
  }

  return (
    <Button
      size={size}
      variant={force ? "outline" : "default"}
      disabled={pending}
      onClick={run}
      type="button"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="size-4" aria-hidden />
      )}
      {pending ? "Checking…" : (label ?? (force ? "Re-run AI check" : "Run AI check"))}
    </Button>
  );
}
