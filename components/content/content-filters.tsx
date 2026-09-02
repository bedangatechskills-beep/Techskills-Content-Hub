import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReferenceData } from "@/lib/content/queries";
import type { ContentFilters as Filters } from "@/lib/content/queries";
import { selectClass } from "./select-field";
import { PRIORITY_LABEL } from "@/lib/workflow/statuses";

/** GET form: every filter lives in the URL so views are shareable. */
export function ContentFilterBar({
  refData,
  filters,
}: {
  refData: ReferenceData;
  filters: Filters;
}) {
  const hasAny = Object.values(filters).some((v) => v);
  return (
    <form method="get" className="grid gap-2 rounded-md border p-3 sm:grid-cols-3 lg:grid-cols-8">
      <Input
        name="q"
        placeholder="Search ID or title"
        defaultValue={filters.q ?? ""}
        aria-label="Search"
        className="lg:col-span-2"
      />
      <select
        name="status"
        defaultValue={filters.status ?? ""}
        aria-label="Status"
        className={selectClass}
      >
        <option value="">Any status</option>
        {refData.statuses.map((s) => (
          <option key={s.key} value={s.key}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        name="region"
        defaultValue={filters.region ?? ""}
        aria-label="Region"
        className={selectClass}
      >
        <option value="">Any region</option>
        {refData.regions.map((r) => (
          <option key={r.code} value={r.code}>
            {r.name}
          </option>
        ))}
      </select>
      <select
        name="program"
        defaultValue={filters.program ?? ""}
        aria-label="Program"
        className={selectClass}
      >
        <option value="">Any program</option>
        {refData.programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        name="campaign"
        defaultValue={filters.campaign ?? ""}
        aria-label="Campaign"
        className={selectClass}
      >
        <option value="">Any campaign</option>
        {refData.campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        name="owner"
        defaultValue={filters.owner ?? ""}
        aria-label="Owner or assignee"
        className={selectClass}
      >
        <option value="">Anyone</option>
        {refData.people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name}
          </option>
        ))}
      </select>
      <select
        name="priority"
        defaultValue={filters.priority ?? ""}
        aria-label="Priority"
        className={selectClass}
      >
        <option value="">Any priority</option>
        {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <select name="due" defaultValue={filters.due ?? ""} aria-label="Due" className={selectClass}>
        <option value="">Any due date</option>
        <option value="overdue">Overdue</option>
        <option value="week">Due in 7 days</option>
      </select>
      <div className="flex gap-2 sm:col-span-3 lg:col-span-7 lg:justify-end">
        {hasAny ? (
          <Button type="button" variant="ghost" render={<Link href="/content" />}>
            Clear
          </Button>
        ) : null}
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
      </div>
    </form>
  );
}
