import type { StageDurationRow } from "@/lib/supabase/database.types";
import { formatDateTime, formatDuration } from "@/lib/workflow/statuses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function StageHistoryCard({ rows }: { rows: StageDurationRow[] }) {
  const total = rows.reduce((s, r) => s + (r.duration_seconds ?? 0), 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stage history</CardTitle>
        <CardDescription>
          Every stage visit with its duration. Total so far: {formatDuration(total)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stage</TableHead>
              <TableHead>Entered</TableHead>
              <TableHead>Exited</TableHead>
              <TableHead className="text-right">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.status_name}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDateTime(r.entered_at)}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {r.is_current ? (
                    <span className="text-foreground font-medium">Current</span>
                  ) : (
                    formatDateTime(r.exited_at)
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDuration(r.duration_seconds)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
