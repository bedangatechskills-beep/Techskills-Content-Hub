import Link from "next/link";
import { ExternalLink, ShieldAlert } from "lucide-react";
import { requirePermission } from "@/lib/auth/access.server";
import { getPublishingQueue } from "@/lib/publishing/queries";
import type { PublishingQueueRow } from "@/lib/supabase/database.types";
import { formatDateTime } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PriorityBadge } from "@/components/content/priority-badge";

export const metadata = { title: "Publishing" };

function QueueTable({ rows, empty }: { rows: PublishingQueueRow[]; empty: string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Content</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead>Publisher</TableHead>
          <TableHead>Flags</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.schedule_id}>
            <TableCell className="whitespace-nowrap tabular-nums">
              {formatDateTime(r.scheduled_at)}
            </TableCell>
            <TableCell>
              <Link
                href={`/content/${r.content_code}?tab=publishing`}
                className="font-mono text-xs hover:underline"
              >
                {r.content_code}
              </Link>
              <div className="font-medium">{r.title}</div>
              <div className="text-muted-foreground text-xs">
                {r.region_code}
                {r.campaign ? ` · ${r.campaign}` : ""}
                {r.notes ? ` · ${r.notes}` : ""}
              </div>
            </TableCell>
            <TableCell>{r.platform}</TableCell>
            <TableCell>{r.publisher_name ?? "Any"}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                <PriorityBadge priority={r.priority ?? "normal"} />
                {r.disclosure_pending ? (
                  <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                    <ShieldAlert className="size-3" aria-hidden /> AI disclosure
                  </Badge>
                ) : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-muted-foreground text-center">
              {empty}
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}

// Publisher queue (D3): Today · This Week · Later · Disclosure pending · Recently published.
export default async function PublishingPage() {
  await requirePermission("publish.publish");
  const q = await getPublishingQueue();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Publishing</h1>
        <p className="text-muted-foreground">
          Everything scheduled, by day. Open a row to post, paste the live URLs and confirm the AI
          disclosure where it is required. Nothing here posts automatically.
        </p>
      </div>

      {q.disclosurePending.length ? (
        <Card className="border-amber-300 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-600" aria-hidden /> Disclosure pending
            </CardTitle>
            <CardDescription>
              These creatives contain AI imagery. Set the platform AI-content toggle and confirm it
              at publish. Publishing is blocked until confirmed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {[...new Map(q.disclosurePending.map((r) => [r.content_id, r])).values()].map((r) => (
                <li key={r.content_id}>
                  <Link
                    href={`/content/${r.content_code}?tab=publishing`}
                    className="text-sm hover:underline"
                  >
                    <span className="font-mono text-xs">{r.content_code}</span> {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
          <CardDescription>Due today or earlier and not yet marked published.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <QueueTable rows={q.today} empty="Nothing to publish today." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This week</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <QueueTable rows={q.thisWeek} empty="Nothing else this week." />
        </CardContent>
      </Card>

      {q.later.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Later</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <QueueTable rows={q.later} empty="" />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Recently published</CardTitle>
          <CardDescription>Last 30 days, with live URLs.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Published</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.recentlyPublished.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatDateTime(r.published_at)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/content/${r.content_code}?tab=publishing`}
                      className="font-mono text-xs hover:underline"
                    >
                      {r.content_code}
                    </Link>
                    <div className="font-medium">{r.title}</div>
                  </TableCell>
                  <TableCell>{r.platform}</TableCell>
                  <TableCell>
                    <a
                      href={r.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-[280px] items-center gap-1 truncate hover:underline"
                    >
                      <span className="truncate">{r.url}</span>
                      <ExternalLink className="size-3 shrink-0" aria-hidden />
                    </a>
                  </TableCell>
                  <TableCell>{r.published_by_name ?? "—"}</TableCell>
                </TableRow>
              ))}
              {q.recentlyPublished.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">
                    Nothing published in the last 30 days.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
