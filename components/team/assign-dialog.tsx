"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { assignProduction } from "@/lib/production/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { workloadLabel } from "./workload-badge";

export interface AssignCandidate {
  profile_id: string;
  full_name: string;
  active_count: number;
  workload_status: string | null;
}

/**
 * Assign button + dialog. The workload hint on each option supports the
 * delegation rule (§31): capacity, not seniority.
 */
export function AssignButton({
  contentId,
  contentCode,
  title,
  candidates,
  size = "sm",
}: {
  contentId: string;
  contentCode: string;
  title: string;
  candidates: AssignCandidate[];
  size?: "sm" | "xs" | "default";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (!assignee) return;
    start(async () => {
      const r = await assignProduction(contentId, assignee, undefined, contentCode);
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      toast.success(`${contentCode} assigned`);
      setOpen(false);
      setAssignee("");
      router.refresh();
    });
  }

  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        Assign
      </Button>
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {contentCode}</DialogTitle>
            <DialogDescription>
              {title}. Pick by capacity and skill, not seniority. The counts show current active
              work.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`assignee-${contentId}`}>Production team member</Label>
            <select
              id={`assignee-${contentId}`}
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
            >
              <option value="">Choose a person</option>
              {candidates.map((c) => (
                <option key={c.profile_id} value={c.profile_id}>
                  {c.full_name} · {c.active_count} active · {workloadLabel(c.workload_status)}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !assignee}>
              {pending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
