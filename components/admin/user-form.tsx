"use client";

import { useActionState } from "react";
import { inviteUser, updateUser } from "@/lib/admin/actions";
import type { UserListRow } from "@/lib/admin/queries";
import type { RoleRow, TeamRow } from "@/lib/supabase/database.types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

interface Props {
  roles: RoleRow[];
  teams: Pick<TeamRow, "id" | "key" | "name" | "is_active">[];
  user?: UserListRow;
  primaryTeamKey?: string | null;
}

// Native <select> keeps the form fully server-action driven (no client state
// to sync) and is accessible out of the box.
export function UserForm({ roles, teams, user, primaryTeamKey }: Props) {
  const [state, action] = useActionState(user ? updateUser : inviteUser, null);
  const memberKeys = new Set(user?.teams.map((t) => t.key) ?? []);

  return (
    <form action={action} className="max-w-xl space-y-6">
      {user ? <input type="hidden" name="profile_id" value={user.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={user?.full_name}
            required
            autoFocus={!user}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={user?.email} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="job_title">Job title</Label>
          <Input id="job_title" name="job_title" defaultValue={user?.job_title ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role_key">Role</Label>
          <select
            id="role_key"
            name="role_key"
            required
            defaultValue={user?.role?.key ?? ""}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
          >
            <option value="" disabled>
              Choose a role
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.key}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        {user ? (
          <div className="space-y-2">
            <Label htmlFor="primary_team_key">Primary team</Label>
            <select
              id="primary_team_key"
              name="primary_team_key"
              defaultValue={primaryTeamKey ?? ""}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs"
            >
              <option value="">None</option>
              {teams.map((t) => (
                <option key={t.id} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Teams</legend>
        <p className="text-muted-foreground text-xs">
          A user may belong to several teams. Teams are working groups; roles decide permissions.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {teams.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                name="team_keys"
                value={t.key}
                defaultChecked={memberKeys.has(t.key)}
                disabled={!t.is_active}
              />
              {t.name}
              {!t.is_active ? (
                <span className="text-muted-foreground text-xs">(inactive)</span>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>

      <FormMessage state={state} />
      <SubmitButton pendingText={user ? "Saving…" : "Sending invitation…"}>
        {user ? "Save changes" : "Create and send invitation"}
      </SubmitButton>
    </form>
  );
}
