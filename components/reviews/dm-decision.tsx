"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus, Trash2, Undo2 } from "lucide-react";
import { dmReview, type ChangeItemInput } from "@/lib/review/actions";
import type { ChangeCategory } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  checklist: string[];
  people: { id: string; full_name: string }[];
  contentReviewRequired: boolean;
  openFlagCount: number;
}

type ItemRow = { description: string; category: ChangeCategory; assigned_user_id: string };

const CATEGORY_LABEL: Record<ChangeCategory, string> = {
  production: "Production",
  script_message: "Script / message",
  other: "Other",
};

const selectClass =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

export function DmDecision({
  contentId,
  contentCode,
  checklist,
  people,
  contentReviewRequired,
  openFlagCount,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);
  const [mode, setMode] = useState<"approve" | "changes" | null>(null);

  const validItems = items.filter((i) => i.description.trim().length > 0);
  const canRequest = feedback.trim().length > 0 || validItems.length > 0;
  const nextStage = contentReviewRequired ? "Content Review" : "Ready for Final Approval";

  function submit(decision: "approved" | "changes_requested") {
    start(async () => {
      const payload: ChangeItemInput[] = validItems.map((i) => ({
        description: i.description.trim(),
        category: i.category,
        assigned_user_id: i.assigned_user_id || undefined,
      }));
      const r = await dmReview(contentId, contentCode, decision, feedback, payload, checks);
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      toast.success(r?.success ?? "Saved");
      setMode(null);
      router.push("/reviews/dm");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {openFlagCount > 0 ? (
        <Alert>
          <AlertTitle>
            {openFlagCount} open hard flag{openFlagCount === 1 ? "" : "s"}
          </AlertTitle>
          <AlertDescription>
            Open hard flags will block Submit for Final Approval later; resolve or dismiss them, or
            request changes.
          </AlertDescription>
        </Alert>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Review checklist (§39)</legend>
        <div className="grid gap-1.5">
          {checklist.map((item) => (
            <label key={item} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!checks[item]}
                onCheckedChange={(v) => setChecks((c) => ({ ...c, [item]: !!v }))}
              />
              {item}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="dm-feedback">Feedback</Label>
        <Textarea
          id="dm-feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          placeholder="Stored with the decision. Required for Request changes unless you add items below."
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Change items</span>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() =>
              setItems((x) => [
                ...x,
                { description: "", category: "production", assigned_user_id: "" },
              ])
            }
          >
            <Plus className="size-3" aria-hidden /> Add item
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          One row per change. Production items go to the editor; script / message items go to the DM
          team and the script flow.
        </p>
        {items.length ? (
          <ul className="space-y-2">
            {items.map((row, i) => (
              <li
                key={i}
                className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_150px_150px_32px]"
              >
                <Input
                  aria-label={`Change item ${i + 1}`}
                  value={row.description}
                  placeholder="What must change"
                  onChange={(e) =>
                    setItems((x) =>
                      x.map((r, j) => (j === i ? { ...r, description: e.target.value } : r)),
                    )
                  }
                />
                <select
                  aria-label={`Category for item ${i + 1}`}
                  className={selectClass}
                  value={row.category}
                  onChange={(e) =>
                    setItems((x) =>
                      x.map((r, j) =>
                        j === i ? { ...r, category: e.target.value as ChangeCategory } : r,
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
                <select
                  aria-label={`Assignee for item ${i + 1}`}
                  className={selectClass}
                  value={row.assigned_user_id}
                  onChange={(e) =>
                    setItems((x) =>
                      x.map((r, j) => (j === i ? { ...r, assigned_user_id: e.target.value } : r)),
                    )
                  }
                >
                  <option value="">Default assignee</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Remove item"
                  onClick={() => setItems((x) => x.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => setMode("approve")}>
          <Check className="size-4" aria-hidden /> Approve DM review
        </Button>
        <Button
          variant="outline"
          disabled={pending || !canRequest}
          onClick={() => setMode("changes")}
        >
          <Undo2 className="size-4" aria-hidden /> Request changes
        </Button>
      </div>

      <Dialog open={mode === "approve"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve DM / Brand Review for {contentCode}?</DialogTitle>
            <DialogDescription>
              The record moves to <strong>{nextStage}</strong>. Your checklist and feedback are
              stored with the decision.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={() => submit("approved")} disabled={pending}>
              {pending ? "Approving…" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "changes"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes on {contentCode}?</DialogTitle>
            <DialogDescription>
              The record moves to Changes Required.{" "}
              {validItems.length
                ? `${validItems.length} change item${validItems.length === 1 ? "" : "s"} will be created and routed by category.`
                : "Your feedback becomes one production change item."}{" "}
              The reason is stored in the activity log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => submit("changes_requested")}
              disabled={pending}
            >
              {pending ? "Sending…" : "Request changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
