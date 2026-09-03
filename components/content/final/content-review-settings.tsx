"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setContentReviewRequired } from "@/lib/final/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function ContentReviewSettings({
  contentId,
  code,
  statusKey,
  required,
  minResponses,
}: {
  contentId: string;
  code: string;
  statusKey: string;
  required: boolean;
  minResponses: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState(required);
  const [quorum, setQuorum] = useState(minResponses);
  const [reason, setReason] = useState("");
  const turningOffAtStage =
    required && !on && (statusKey === "content_review" || statusKey === "ready_for_final_approval");
  const dirty = on !== required || quorum !== minResponses;

  function save() {
    start(async () => {
      const r = await setContentReviewRequired(contentId, code, on, quorum, reason || undefined);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Saved");
        setReason("");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Review</CardTitle>
        <CardDescription>
          Optional independent review (§43). Off by default; turn it on for major campaigns, claims,
          launches or sensitive messaging.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="cr-required">Content Review required</Label>
          <Switch
            id="cr-required"
            checked={on}
            onCheckedChange={(v) => setOn(v)}
            disabled={pending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cr-quorum">Minimum reviewer responses</Label>
          <Input
            id="cr-quorum"
            type="number"
            min={1}
            max={10}
            value={quorum}
            onChange={(e) => setQuorum(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            disabled={pending || !on}
            className="w-24"
          />
        </div>
        {turningOffAtStage ? (
          <div className="space-y-1">
            <Label htmlFor="cr-reason">Reason (required — this is a stage skip)</Label>
            <Textarea
              id="cr-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        ) : null}
        <Button
          size="sm"
          disabled={pending || !dirty || (turningOffAtStage && !reason.trim())}
          onClick={save}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
