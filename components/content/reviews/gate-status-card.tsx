import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import type { GateStatus } from "@/lib/review/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Row({ ok, warn, text }: { ok: boolean; warn?: boolean; text: string }) {
  const Icon = ok ? CheckCircle2 : warn ? AlertTriangle : CircleDashed;
  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon
        className={
          ok
            ? "size-4 text-emerald-600"
            : warn
              ? "size-4 text-amber-600"
              : "text-muted-foreground size-4"
        }
        aria-hidden
      />
      <span>{text}</span>
    </li>
  );
}

export function GateStatusCard({ gate }: { gate: GateStatus | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gate status</CardTitle>
        <CardDescription>
          What still stands between this record and final approval. Soft scores never block; hard
          flags must be resolved or dismissed with a reason.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!gate ? (
          <p className="text-muted-foreground text-sm">Not available.</p>
        ) : (
          <ul className="space-y-2">
            <Row
              ok={gate.script_approved}
              text={gate.script_approved ? "Script approved" : "Script not yet approved"}
            />
            <Row
              ok={gate.has_creative}
              text={gate.has_creative ? "Creative version uploaded" : "No creative version yet"}
            />
            <Row
              ok={gate.has_creative_evaluation}
              warn={gate.has_creative && !gate.has_creative_evaluation}
              text={
                gate.has_creative_evaluation
                  ? "AI creative check completed"
                  : "AI creative check not run on the current version"
              }
            />
            <Row
              ok={gate.open_hard_flag_count === 0}
              warn={gate.open_hard_flag_count > 0}
              text={
                gate.open_hard_flag_count === 0
                  ? "No open hard flags"
                  : `${gate.open_hard_flag_count} open hard flag${gate.open_hard_flag_count === 1 ? "" : "s"}`
              }
            />
            <Row
              ok={!gate.nepali_pending}
              warn={gate.nepali_pending}
              text={
                gate.nepali_pending
                  ? "Nepali verification pending"
                  : "No Nepali verification pending"
              }
            />
            <Row
              ok={!gate.requires_ai_disclosure}
              warn={gate.requires_ai_disclosure}
              text={
                gate.requires_ai_disclosure
                  ? "AI disclosure required at publish"
                  : "No AI disclosure required"
              }
            />
            <Row
              ok={gate.open_change_requests === 0}
              warn={gate.open_change_requests > 0}
              text={
                gate.open_change_requests === 0
                  ? "No open change requests"
                  : `${gate.open_change_requests} open change request${gate.open_change_requests === 1 ? "" : "s"}`
              }
            />
            <Row
              ok={gate.open_tasks === 0}
              text={
                gate.open_tasks === 0
                  ? "All production tasks done"
                  : `${gate.open_tasks} open task${gate.open_tasks === 1 ? "" : "s"}`
              }
            />
            <Row
              ok={gate.has_folder}
              warn={!gate.has_folder}
              text={gate.has_folder ? "Production folder linked" : "Production folder link missing"}
            />
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
