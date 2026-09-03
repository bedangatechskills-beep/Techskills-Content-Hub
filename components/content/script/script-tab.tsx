import type { ContentDetail } from "@/lib/content/queries";
import type { ScriptTabData } from "@/lib/script/queries";
import type { Access } from "@/lib/permissions/access";
import { can } from "@/lib/permissions/access";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScriptEditor } from "./script-editor";
import { MaterialPrompt } from "./material-prompt";
import { AiCheckCard } from "./ai-check-card";
import { ScriptActions } from "./script-actions";
import { VersionsCard } from "./versions-card";
import { ApprovalsCard } from "./approvals-card";
import { NepaliAlert } from "./nepali-alert";

export function ScriptTab({
  detail,
  data,
  access,
}: {
  detail: ContentDetail;
  data: ScriptTabData;
  access: Access;
}) {
  const { record } = detail;
  const code = record.content_id;
  const canEdit = can(access, "script.edit");
  const canSubmit = can(access, "script.submit");
  const canApprove = can(access, "script.approve");
  const canResolve = canEdit || can(access, "dm.review");
  const current = data.current;
  const evaluation = current?.latest_evaluation
    ? (data.evaluations.find((e) => e.id === current.latest_evaluation?.id) ?? null)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Current:</span>
        <Badge variant="outline" className="font-mono">
          {current ? `V${current.version_no}` : "none"}
        </Badge>
        <span className="text-muted-foreground">Approved:</span>
        <Badge
          className={data.approved ? "bg-emerald-600 font-mono text-white" : "font-mono"}
          variant={data.approved ? "default" : "outline"}
        >
          {data.approved ? `V${data.approved.version_no}` : "none"}
        </Badge>
        <NepaliAlert
          state={record.nepali_verification}
          contentId={record.id}
          contentCode={code}
          canVerify={access.profile.can_verify_nepali}
        />
      </div>

      {data.changedAfterApproval && current && data.approved ? (
        <Alert className="border-amber-500/50">
          <AlertTitle>
            Current V{current.version_no} differs from approved V{data.approved.version_no}
          </AlertTitle>
          <AlertDescription>
            {data.pendingMaterialAnswer
              ? "Production builds from the approved version until this change is classified."
              : current.is_material_change
                ? "Classified as material. Re-approval is in progress; the previous approval stays in history."
                : "Classified as non-material. The approval still covers this script."}
          </AlertDescription>
        </Alert>
      ) : null}

      {data.pendingMaterialAnswer && canEdit && current ? (
        <MaterialPrompt versionId={current.id} versionNo={current.version_no} contentCode={code} />
      ) : null}

      {current ? (
        <ScriptActions
          versionId={current.id}
          versionNo={current.version_no}
          contentCode={code}
          statusKey={record.status_key}
          canSubmit={canSubmit}
          canApprove={canApprove}
          hasEvaluation={!!current.latest_evaluation}
          requireAi={data.settings.require_ai_before_submit}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <ScriptEditor
            contentId={record.id}
            contentCode={code}
            currentBody={current?.body ?? ""}
            currentVersionNo={current?.version_no ?? null}
            scriptShape={current?.script_shape ?? null}
            canEdit={canEdit}
          />
          {current ? (
            <AiCheckCard
              queued={data.queued}
              versionId={current.id}
              versionNo={current.version_no}
              contentCode={code}
              evaluation={evaluation}
              canRun={canEdit || canApprove}
              canResolve={canResolve}
            />
          ) : null}
        </div>
        <div className="space-y-6">
          <VersionsCard
            versions={data.versions}
            currentId={current?.id ?? null}
            approvedId={data.approved?.id ?? null}
          />
          <ApprovalsCard approvals={data.approvals} />
        </div>
      </div>
    </div>
  );
}
