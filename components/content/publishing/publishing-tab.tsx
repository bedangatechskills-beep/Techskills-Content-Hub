import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";
import type { ContentDetail } from "@/lib/content/queries";
import type { PublishingTabData } from "@/lib/publishing/queries";
import { can, type Access } from "@/lib/permissions/access";
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
import { ScheduleForm } from "./schedule-form";
import { PublishForm } from "./publish-form";
import { ArchiveButton, UnscheduleButton } from "./publishing-actions";

export function PublishingTab({
  detail,
  data,
  access,
}: {
  detail: ContentDetail;
  data: PublishingTabData;
  access: Access;
}) {
  const { record } = detail;
  const status = record.status_key;
  const canSchedule = can(access, "publish.schedule");
  const canPublish = can(access, "publish.publish");
  const canArchive = canSchedule || can(access, "admin.users");
  const showScheduleForm = canSchedule && (status === "final_approved" || status === "scheduled");
  const showPublishForm = canPublish && status === "scheduled";
  const notYet = !["final_approved", "scheduled", "published", "archived"].includes(status);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="space-y-6">
        {notYet ? (
          <Card>
            <CardHeader>
              <CardTitle>Not ready for scheduling</CardTitle>
              <CardDescription>
                Scheduling opens once the record reaches Final Approved. Until then the target
                publish date on the Overview drives the calendar.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {showScheduleForm ? (
          <ScheduleForm
            contentId={record.id}
            code={record.content_id}
            statusKey={status}
            existing={data.schedules}
            platforms={data.platforms}
            publishers={data.publishers}
            contentPlatformIds={detail.platformIds}
            defaultPublisherId={data.publishers.length === 1 ? data.publishers[0].id : null}
          />
        ) : null}

        {showPublishForm ? (
          <PublishForm
            contentId={record.id}
            code={record.content_id}
            requiresDisclosure={record.requires_ai_disclosure}
            schedules={data.schedules}
            platforms={data.platforms}
          />
        ) : null}

        {data.links.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Live URLs</CardTitle>
              <CardDescription>
                Published {formatDateTime(record.published_at)}
                {data.links[0]?.published_by_name ? ` by ${data.links[0].published_by_name}` : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Published</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.links.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.platform_name}</TableCell>
                      <TableCell>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-[360px] items-center gap-1 truncate hover:underline"
                        >
                          <span className="truncate">{l.url}</span>
                          <ExternalLink className="size-3 shrink-0" aria-hidden />
                        </a>
                      </TableCell>
                      <TableCell>{formatDateTime(l.published_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Publishing status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              {record.requires_ai_disclosure ? (
                <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                  AI disclosure required
                </Badge>
              ) : (
                <Badge variant="outline">No AI disclosure needed</Badge>
              )}
              {data.confirmations.some((c) => c.ai_disclosure_confirmed) ? (
                <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                  <ShieldCheck className="size-3" aria-hidden /> Disclosure confirmed
                </Badge>
              ) : null}
            </div>
            {data.schedules.length ? (
              <ul className="space-y-2">
                {data.schedules.map((s) => (
                  <li key={s.id} className="rounded-md border p-2">
                    <div className="font-medium">{s.platform_name}</div>
                    <div className="text-muted-foreground text-xs">
                      {formatDateTime(s.scheduled_at)} · {s.publisher_name ?? "Any publisher"}
                      {s.campaign_name ? ` · ${s.campaign_name}` : ""}
                    </div>
                    {s.notes ? <div className="mt-1 text-xs">{s.notes}</div> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                {status === "scheduled" ? "No active schedule rows." : "Not scheduled yet."}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {status === "scheduled" && canSchedule ? (
                <UnscheduleButton contentId={record.id} code={record.content_id} />
              ) : null}
              {status === "published" && canArchive ? (
                <ArchiveButton contentId={record.id} code={record.content_id} />
              ) : null}
            </div>
            {canPublish ? (
              <Link href="/publishing" className="text-xs hover:underline">
                Open the publishing queue
              </Link>
            ) : null}
          </CardContent>
        </Card>

        {data.confirmations.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Publish confirmations</CardTitle>
              <CardDescription>One logged checkbox per publish action.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {data.confirmations.map((c) => (
                  <li key={c.id} className="rounded-md border p-2">
                    <div>
                      {c.ai_disclosure_required
                        ? c.ai_disclosure_confirmed
                          ? "AI disclosure confirmed"
                          : "AI disclosure NOT confirmed"
                        : "No disclosure required"}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {formatDateTime(c.confirmed_at)}
                      {c.note ? ` · ${c.note}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
