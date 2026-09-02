import Link from "next/link";
import { Search } from "lucide-react";
import type { ReferenceData } from "@/lib/content/queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Values {
  region: string;
  program: string;
  campaign: string;
  owner: string;
  priority: string;
  q: string;
}

const selectClass =
  "border-input bg-background h-8 rounded-md border px-2 text-xs shadow-xs min-w-[8rem] max-w-[14rem]";

/** GET form: filters live in the URL so the board is shareable. */
export function BoardFilters({ refData, values }: { refData: ReferenceData; values: Values }) {
  const active = Object.values(values).some((v) => v !== "");
  return (
    <form method="get" className="flex flex-wrap items-end gap-2" aria-label="Board filters">
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Region</span>
        <select name="region" defaultValue={values.region} className={selectClass}>
          <option value="">All</option>
          {refData.regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Program</span>
        <select name="program" defaultValue={values.program} className={selectClass}>
          <option value="">All</option>
          {refData.programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Campaign</span>
        <select name="campaign" defaultValue={values.campaign} className={selectClass}>
          <option value="">All</option>
          {refData.campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Owner / assignee</span>
        <select name="owner" defaultValue={values.owner} className={selectClass}>
          <option value="">Anyone</option>
          {refData.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Priority</span>
        <select name="priority" defaultValue={values.priority} className={selectClass}>
          <option value="">All</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Search</span>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-2 left-2 size-3.5"
            aria-hidden
          />
          <Input
            name="q"
            defaultValue={values.q}
            placeholder="ID or title"
            className="h-8 w-44 pl-7 text-xs"
          />
        </div>
      </label>
      <Button type="submit" size="sm">
        Apply
      </Button>
      {active ? (
        <Button type="button" size="sm" variant="ghost" render={<Link href="/board" />}>
          Clear
        </Button>
      ) : null}
    </form>
  );
}
