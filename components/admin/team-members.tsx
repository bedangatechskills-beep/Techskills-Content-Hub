"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setTeamMembers } from "@/lib/admin/actions";
import type { ProfileRow } from "@/lib/supabase/database.types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  teamId: string;
  memberIds: string[];
  people: Pick<ProfileRow, "id" | "full_name" | "email" | "account_status">[];
}

export function TeamMembers({ teamId, memberIds, people }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(memberIds));
  const [pending, start] = useTransition();
  const dirty = selected.size !== memberIds.length || memberIds.some((id) => !selected.has(id));

  function save() {
    start(async () => {
      const result = await setTeamMembers(teamId, [...selected]);
      if (result?.error) toast.error(result.error);
      else toast.success(result?.success ?? "Saved");
    });
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-md border">
        {people.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <Checkbox
              id={`m-${p.id}`}
              checked={selected.has(p.id)}
              onCheckedChange={(v) => {
                const next = new Set(selected);
                if (v) next.add(p.id);
                else next.delete(p.id);
                setSelected(next);
              }}
            />
            <label htmlFor={`m-${p.id}`} className="flex-1">
              {p.full_name} <span className="text-muted-foreground">· {p.email}</span>
            </label>
            {p.account_status !== "active" ? (
              <Badge variant="outline">{p.account_status.replace("_", " ")}</Badge>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">
        Removing someone from a team never removes their historical actions.
      </p>
      <Button onClick={save} disabled={!dirty || pending}>
        {pending ? "Saving…" : "Save members"}
      </Button>
    </div>
  );
}
