import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";
import { requireActiveUser } from "@/lib/auth/access.server";
import { can } from "@/lib/permissions/access";
import { getReferenceData, listKanbanCards, type ContentFilters } from "@/lib/content/queries";
import { formatDate, timeAgo } from "@/lib/workflow/statuses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/content/status-pill";
import { PriorityBadge } from "@/components/content/priority-badge";
import { ContentFilterBar } from "@/components/content/content-filters";

export const metadata = { title: "Content" };

type Search = Record<string, string | string[] | undefined>;

function pick(sp: Search, key: string): string | undefined {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s ? s : undefined;
}

export default async function ContentListPage({ searchParams }: { searchParams: Promise<Search> }) {
  const access = await requireActiveUser();
  const sp = await searchParams;
  const due = pick(sp, "due");
  const filters: ContentFilters = {
    q: pick(sp, "q"),
    status: pick(sp, "status"),
    region: pick(sp, "region"),
    program: pick(sp, "program"),
    campaign: pick(sp, "campaign"),
    owner: pick(sp, "owner"),
    priority: pick(sp, "priority"),
    due: due === "overdue" || due === "week" ? due : undefined,
  };
  const [refData, rows] = await Promise.all([getReferenceData(), listKanbanCards(filters)]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Content</h1>
          <p className="text-muted-foreground">
            Every piece of content, one record each, from request to publish.
          </p>
        </div>
        {can(access, "content.create") ? (
          <Button render={<Link href="/content/new" />}>
            <Plus className="size-4" /> New request
          </Button>
        ) : null}
      </div>

      <ContentFilterBar refData={refData} filters={filters} />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Owner / assignee</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Comments</span>
                <MessageSquare className="inline size-3.5" aria-hidden />
              </TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link
                    href={`/content/${r.content_id}`}
                    className="font-mono text-xs font-medium hover:underline"
                  >
                    {r.content_id}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[28ch]">
                  <Link href={`/content/${r.content_id}`} className="font-medium hover:underline">
                    {r.title}
                  </Link>
                  {r.is_stalled ? (
                    <Badge
                      variant="outline"
                      className="ml-2 border-amber-500/50 text-amber-700 dark:text-amber-400"
                    >
                      Potentially stalled
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>
                  <StatusPill
                    name={r.status_name ?? r.status_key ?? ""}
                    colourKey={r.colour_key}
                    size="sm"
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">{r.content_type}</TableCell>
                <TableCell>{r.region_code}</TableCell>
                <TableCell>
                  <PriorityBadge priority={r.priority} />
                </TableCell>
                <TableCell className="text-sm">
                  {r.assignee_name ?? r.dm_owner_name ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell
                  className={
                    r.is_overdue ? "text-red-700 dark:text-red-400" : "text-muted-foreground"
                  }
                >
                  {formatDate(r.due_date)}
                  {r.is_overdue ? <span className="ml-1 text-xs font-medium">Overdue</span> : null}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {r.comment_count ?? 0}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                  {r.last_activity_at
                    ? `${timeAgo(r.last_activity_at)}${r.last_activity_by ? ` by ${r.last_activity_by}` : ""}`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-muted-foreground py-10 text-center">
                  No content matches these filters.
                  {can(access, "content.create") ? (
                    <>
                      {" "}
                      <Link href="/content/new" className="underline underline-offset-4">
                        Create the first request
                      </Link>
                      .
                    </>
                  ) : null}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
