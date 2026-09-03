"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Undo2 } from "lucide-react";
import { productionReview } from "@/lib/production/actions";
import type { CreativeEntry } from "@/lib/production/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

export function ProductionReviewCard({
  contentId,
  code,
  checklist,
  current,
}: {
  contentId: string;
  code: string;
  checklist: string[];
  current: CreativeEntry | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [confirmReturn, setConfirmReturn] = useState(false);

  function decide(decision: "pass" | "changes") {
    start(async () => {
      const r = await productionReview(contentId, code, decision, ticks, notes);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Done");
        setConfirmReturn(false);
        router.refresh();
      }
    });
  }

  const ticked = checklist.filter((c) => ticks[c]).length;

  return (
    <Card className="border-amber-500/40">
      <CardHeader>
        <CardTitle>Production review</CardTitle>
        <CardDescription>
          Technical quality check (§36). Pass sends the creative to DM / Brand Review; returning it
          needs a reason.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="bg-muted flex aspect-video items-center justify-center overflow-hidden rounded-md">
          {current?.signed_url && current.mime?.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.signed_url}
              alt={`Creative V${current.version_no}`}
              className="h-full w-full object-contain"
            />
          ) : current?.signed_url && current.mime?.startsWith("video/") ? (
            <video controls src={current.signed_url} className="h-full w-full" preload="metadata" />
          ) : (
            <span className="text-muted-foreground text-xs">
              {current ? `V${current.version_no} · ${current.file_name}` : "No current creative"}
            </span>
          )}
        </div>
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              Checklist{" "}
              <span className="text-muted-foreground font-normal">
                {ticked}/{checklist.length}
              </span>
            </legend>
            {checklist.map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={!!ticks[item]}
                  onCheckedChange={(v) => setTicks((t) => ({ ...t, [item]: !!v }))}
                  disabled={pending}
                />
                {item}
              </label>
            ))}
          </fieldset>
          <div className="space-y-1">
            <Label htmlFor="review-notes">Notes</Label>
            <Textarea
              id="review-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Required when returning to production"
              disabled={pending}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => decide("pass")} disabled={pending}>
              <CheckCircle2 className="size-4" aria-hidden /> Pass production review
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmReturn(true)}
              disabled={pending || !notes.trim()}
            >
              <Undo2 className="size-4" aria-hidden /> Return to production
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={confirmReturn} onOpenChange={setConfirmReturn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to production?</DialogTitle>
            <DialogDescription>
              The assignee gets your notes as the reason and the record goes back to Production.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-md border p-3 text-sm italic">“{notes.trim()}”</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReturn(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => decide("changes")} disabled={pending}>
              {pending ? "Returning…" : "Return with this reason"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
