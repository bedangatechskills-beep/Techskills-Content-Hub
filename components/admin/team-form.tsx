"use client";

import { useActionState } from "react";
import { upsertTeam } from "@/lib/admin/actions";
import type { TeamWithMembers } from "@/lib/admin/queries";
import type { ProfileRow } from "@/lib/supabase/database.types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

interface Props {
  team?: TeamWithMembers;
  people: Pick<ProfileRow, "id" | "full_name" | "email" | "account_status">[];
}

export function TeamForm({ team, people }: Props) {
  const [state, action] = useActionState(upsertTeam, null);
  return (
    <form action={action} className="max-w-xl space-y-6">
      {!team ? <input type="hidden" name="redirect" value="detail" /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="key">Key</Label>
          <Input
            id="key"
            name="key"
            defaultValue={team?.key}
            readOnly={!!team}
            pattern="[a-z_]+"
            placeholder="e.g. video"
            required
          />
          <p className="text-muted-foreground text-xs">
            Lower-case letters and underscores. Cannot change later.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={team?.name} required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={team?.description ?? ""}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supervisor_id">Supervisor</Label>
          <select
            id="supervisor_id"
            name="supervisor_id"
            defaultValue={team?.supervisor_id ?? ""}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
          >
            <option value="">None</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
                {p.account_status !== "active" ? ` (${p.account_status.replace("_", " ")})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="is_active" defaultChecked={team?.is_active ?? true} />
            Active
          </label>
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">{team ? "Save team" : "Create team"}</SubmitButton>
    </form>
  );
}
