"use client";

import { useActionState } from "react";
import { addComment } from "@/lib/content/actions";
import type { ReferenceData } from "@/lib/content/queries";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";
import { selectClass } from "./select-field";

export const SECTION_LABEL: Record<string, string> = {
  general: "General",
  concept: "Concept",
  script: "Script",
  production: "Production",
  review: "Review",
  final_approval: "Final approval",
};

export function CommentForm({
  contentId,
  contentCode,
  people,
  selfId,
}: {
  contentId: string;
  contentCode: string;
  people: ReferenceData["people"];
  selfId: string;
}) {
  const [state, action] = useActionState(addComment, null);
  return (
    <form action={action} className="space-y-4 rounded-md border p-4">
      <input type="hidden" name="content_id" value={contentId} />
      <input type="hidden" name="content_code" value={contentCode} />
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div className="space-y-2">
          <Label htmlFor="comment-section">Section</Label>
          <select
            id="comment-section"
            name="section"
            defaultValue="general"
            className={selectClass}
          >
            {Object.entries(SECTION_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="comment-body">Comment</Label>
          <Textarea
            id="comment-body"
            name="body"
            rows={3}
            required
            placeholder="Write a comment…"
          />
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Mention</legend>
        <div className="flex flex-wrap gap-3">
          {people
            .filter((p) => p.id !== selfId)
            .map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <Checkbox name="mentions" value={p.id} /> {p.full_name}
              </label>
            ))}
        </div>
        <p className="text-muted-foreground text-xs">Mentioned people get a notification.</p>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton pendingText="Posting…">Post comment</SubmitButton>
    </form>
  );
}
