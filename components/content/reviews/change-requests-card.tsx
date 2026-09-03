"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { reopenChangeRequest, resolveChangeRequest } from "@/lib/review/actions";
import type { ChangeRequestEntry } from "@/lib/review/queries";
import { formatDateTime } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReasonDialog } from "@/components/content/script/reason-dialog";

const CATEGORY_LABEL: Record<string, string> = {
  production: "Production",
  script_message: "Script / message",
  other: "Other",
};
const SOURCE_LABEL: Record<string, string> = {
  dm_review: "DM review",
  final_approval: "Final approval",
  content_review: "Content review",
  production_review: "Production review",
};

export function ChangeRequestsCard({
  requests,
  code,
  canReopen,
}: {
  requests: ChangeRequestEntry[];
  code: string;
  canReopen: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [resolving, setResolving] = useState<string | null>(null);
  const [reopening, setReopening] = useState<string | null>(null);

  const open = requests.filter((r) => !r.is_resolved);
  const done = requests.filter((r) => r.is_resolved);

  function resolve(id: string, note: string) {
    start(async () => {
      const r = await resolveChangeRequest(id, code, note || undefined);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Resolved");
        setResolving(null);
        router.refresh();
      }
    });
  }
  function reopen(id: string, reason: string) {
    start(async () => {
      const r = await reopenChangeRequest(id, code, reason);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Reopened");
        setReopening(null);
        router.refresh();
      }
    });
  }

  function Item({ r }: { r: ChangeRequestEntry }) {
    return (
      <li className="rounded-md border p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={r.category === "script_message" ? "secondary" : "outline"}>
            {CATEGORY_LABEL[r.category] ?? r.category}
          </Badge>
          <span className="text-muted-foreground text-xs">
            Revision {r.revision_no} · from {SOURCE_LABEL[r.source] ?? r.source}
          </span>
          {r.is_resolved ? (
            <Badge className="bg-emerald-600 text-white">Resolved</Badge>
          ) : (
            <Badge className="bg-orange-500 text-white">Open</Badge>
          )}
        </div>
        <p className="mt-2 whitespace-pre-wrap">{r.description}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Requested by {r.requested_by_name ?? "—"} · {formatDateTime(r.created_at)} · assigned to{" "}
          {r.assigned_user_name ?? r.assigned_team_name ?? "—"}
        </p>
        {r.is_resolved ? (
          <p className="text-muted-foreground mt-1 text-xs">
            Resolved by {r.resolved_by_name ?? "—"} · {formatDateTime(r.resolved_at)}
            {r.resolution_note ? ` — ${r.resolution_note}` : ""}
          </p>
        ) : null}
        <div className="mt-2 flex gap-2">
          {!r.is_resolved ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setResolving(r.id)}
            >
              Resolve…
            </Button>
          ) : canReopen ? (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setReopening(r.id)}>
              Reopen…
            </Button>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Change requests{" "}
          <span className="text-muted-foreground text-sm font-normal">
            ({open.length} open · {done.length} resolved)
          </span>
        </CardTitle>
        <CardDescription>
          Every request carries who asked, why, and who it went to. Script and message issues route
          to the DM team; production issues to the assignee.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-muted-foreground text-sm">No change requests on this record.</p>
        ) : (
          <ul className="space-y-3">
            {open.map((r) => (
              <Item key={r.id} r={r} />
            ))}
            {done.map((r) => (
              <Item key={r.id} r={r} />
            ))}
          </ul>
        )}
      </CardContent>

      <ReasonDialog
        open={resolving !== null}
        onOpenChange={(o) => !o && setResolving(null)}
        title="Resolve change request"
        description="Say what was done. The note is kept with the request."
        label="Resolution note"
        required={false}
        confirmText="Mark resolved"
        pending={pending}
        onConfirm={(note) => resolving && resolve(resolving, note)}
      />
      <ReasonDialog
        open={reopening !== null}
        onOpenChange={(o) => !o && setReopening(null)}
        title="Reopen change request"
        description="A reason is required to reopen."
        confirmText="Reopen"
        pending={pending}
        onConfirm={(reason) => reopening && reopen(reopening, reason)}
      />
    </Card>
  );
}
