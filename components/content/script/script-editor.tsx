"use client";

import { useActionState } from "react";
import { createScriptVersion } from "@/lib/script/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

const SHAPE_HINT: Record<string, string> = {
  spoken: "Spoken script: write what is said on camera, one beat per line.",
  copy_spec:
    "Copy spec: headline / subhead / body / CTA / contact block. Written down before it is set in a layout.",
  caption: "Caption text exactly as it will be posted, hashtags included.",
  shot_list: "Shot list: one shot per line with any on-screen text.",
  none: "One-off: describe the copy or text that will appear.",
};

export function ScriptEditor({
  contentId,
  contentCode,
  currentBody,
  currentVersionNo,
  scriptShape,
  canEdit,
}: {
  contentId: string;
  contentCode: string;
  currentBody: string;
  currentVersionNo: number | null;
  scriptShape: string | null;
  canEdit: boolean;
}) {
  const [state, action] = useActionState(createScriptVersion, null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {currentVersionNo
            ? `Script — editing from V${currentVersionNo}`
            : "Script — first version"}
        </CardTitle>
        <CardDescription>
          {SHAPE_HINT[scriptShape ?? ""] ??
            "The hub shows the current script directly. It must not live only in a document."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="content_id" value={contentId} />
          <input type="hidden" name="content_code" value={contentCode} />
          <div className="space-y-2">
            <Label htmlFor="script-body">Script / copy</Label>
            <Textarea
              id="script-body"
              name="body"
              rows={14}
              defaultValue={currentBody}
              readOnly={!canEdit}
              required
              className="font-mono text-sm leading-relaxed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="script-summary">Change summary</Label>
            <Input
              id="script-summary"
              name="change_summary"
              placeholder="e.g. Initial draft · DM update · Fixed CTA"
              readOnly={!canEdit}
            />
          </div>
          <FormMessage state={state} />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton disabled={!canEdit} pendingText="Saving…">
              Save as new version
            </SubmitButton>
            <p className="text-muted-foreground text-xs">
              Every save creates a new version; nothing is overwritten.
            </p>
          </div>
          {!canEdit ? (
            <p className="text-muted-foreground text-xs">
              Read-only: your role cannot edit scripts.
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
