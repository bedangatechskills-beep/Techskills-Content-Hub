"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clapperboard, FileText } from "lucide-react";
import { routeChangesRequired } from "@/lib/review/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RouteBox({
  contentId,
  code,
  openCount,
  canRouteToScript,
}: {
  contentId: string;
  code: string;
  openCount: number;
  canRouteToScript: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function route(target: "production" | "script_copy") {
    start(async () => {
      const r = await routeChangesRequired(contentId, code, target);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Routed");
        router.refresh();
      }
    });
  }

  return (
    <Card className="border-orange-500/40">
      <CardHeader>
        <CardTitle>Changes Required — route the rework</CardTitle>
        <CardDescription>
          {openCount > 0
            ? `${openCount} request${openCount === 1 ? "" : "s"} still open. `
            : "All requests resolved. "}
          Production issues go back to Production; script or message issues go back to Script / Copy
          (a changed script may need re-approval).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => route("production")}>
          <Clapperboard className="size-4" aria-hidden /> Send back to Production
        </Button>
        <Button
          variant="outline"
          disabled={pending || !canRouteToScript}
          onClick={() => route("script_copy")}
          title={canRouteToScript ? undefined : "Needs script.edit"}
        >
          <FileText className="size-4" aria-hidden /> Send back to Script / Copy
        </Button>
      </CardContent>
    </Card>
  );
}
