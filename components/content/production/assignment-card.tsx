"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";
import { assignProduction } from "@/lib/production/actions";
import type { AssignmentEntry } from "@/lib/production/queries";
import { formatDateTime } from "@/lib/workflow/statuses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ReasonDialog } from "@/components/content/script/reason-dialog";

const selectClass =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs disabled:opacity-60";

export function AssignmentCard({
  contentId,
  code,
  assigneeId,
  assigneeName,
  managerName,
  people,
  canAssign,
  history,
}: {
  contentId: string;
  code: string;
  assigneeId: string | null;
  assigneeName: string | null;
  managerName: string | null;
  people: { id: string; full_name: string }[];
  canAssign: boolean;
  history: AssignmentEntry[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [choice, setChoice] = useState(assigneeId ?? "");
  const [askReason, setAskReason] = useState(false);

  function run(reason?: string) {
    start(async () => {
      const r = await assignProduction(contentId, choice || null, reason, code);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Done");
        setAskReason(false);
        router.refresh();
      }
    });
  }

  function onAssign() {
    if (choice === (assigneeId ?? "")) return;
    if (assigneeId) setAskReason(true);
    else run();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment</CardTitle>
        <CardDescription>Assigned by workload and capability, not seniority (§31).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">Assignee</dt>
          <dd className="font-medium">
            {assigneeName ?? <span className="text-muted-foreground">Unassigned</span>}
          </dd>
          <dt className="text-muted-foreground">Production manager</dt>
          <dd className="font-medium">
            {managerName ?? <span className="text-muted-foreground">—</span>}
          </dd>
        </dl>

        {canAssign ? (
          <div className="space-y-2">
            <Label htmlFor="assignee-select">Assign to</Label>
            <div className="flex gap-2">
              <select
                id="assignee-select"
                className={selectClass}
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
                disabled={pending}
              >
                <option value="">Nobody</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
              <Button onClick={onAssign} disabled={pending || choice === (assigneeId ?? "")}>
                <UserCheck className="size-4" aria-hidden /> Assign
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Assigning from Ready for Production starts Production. Reassigning needs a reason.
            </p>
          </div>
        ) : null}

        {history.length ? (
          <div>
            <p className="mb-1 text-xs font-medium">History</p>
            <ul className="space-y-1 text-xs">
              {history.map((a) => (
                <li key={a.id} className="text-muted-foreground">
                  <span className="text-foreground">{a.assignee_name ?? "Nobody"}</span> by{" "}
                  {a.assigned_by_name ?? "system"} · {formatDateTime(a.assigned_at)}
                  {a.unassigned_at ? ` → ${formatDateTime(a.unassigned_at)}` : " · current"}
                  {a.reason ? <span className="block italic">“{a.reason}”</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>

      <ReasonDialog
        open={askReason}
        onOpenChange={setAskReason}
        title="Reassign production"
        description="Reassigning work that already has an assignee needs a reason; it goes into the activity log."
        confirmText="Reassign"
        pending={pending}
        onConfirm={(reason) => run(reason)}
      />
    </Card>
  );
}
