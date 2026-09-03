"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

export function PeoplePicker({
  people,
  selectedId,
}: {
  people: { id: string; full_name: string }[];
  selectedId: string;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="people-picker">Person</Label>
        <select
          id="people-picker"
          value={selectedId}
          onChange={(e) => router.push(`/people/${e.target.value}/backlog`)}
          className="border-input bg-background h-9 min-w-56 rounded-md border px-3 text-sm shadow-xs"
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>
      <Link href="/me" className="text-primary pb-2 text-sm underline-offset-4 hover:underline">
        My backlog
      </Link>
    </div>
  );
}
