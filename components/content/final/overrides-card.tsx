import type { OverrideEntry } from "@/lib/final/queries";
import { formatDateTime } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const KIND: Record<string, string> = {
  reviewer_quorum: "Reviewer quorum",
  reviewer_threshold: "Review threshold",
  reviewer_recommendation: "Reviewer recommendation",
  hard_flags: "Hard flags",
};

export function OverridesCard({ overrides }: { overrides: OverrideEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overrides</CardTitle>
        <CardDescription>
          Overrides are permanent and visible to the CEO (§47, §51).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {overrides.length === 0 ? (
          <p className="text-muted-foreground text-sm">No overrides.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {overrides.map((o) => (
              <li key={o.id} className="space-y-1 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-amber-500 text-white">{KIND[o.kind] ?? o.kind}</Badge>
                  <span className="font-medium">{o.actor_name ?? "—"}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(o.created_at)}
                  </span>
                </div>
                <p className="text-muted-foreground border-l-2 pl-2 text-xs">{o.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
