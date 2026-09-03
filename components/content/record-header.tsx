import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Folder,
  FolderX,
  Languages,
  MapPin,
  Sparkles,
} from "lucide-react";
import type { GateStatus } from "@/lib/review/queries";
import type { ContentDetail, ReferenceData } from "@/lib/content/queries";
import { formatDate, timeAgo } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "./status-pill";
import { PriorityBadge } from "./priority-badge";
import { StageTimer } from "./stage-timer";
import { StageActions } from "./stage-actions";

export function RecordHeader({
  detail,
  refData,
  banner,
  gate,
}: {
  detail: ContentDetail;
  refData: ReferenceData;
  /** e.g. SCRIPT CHANGED AFTER APPROVAL */
  banner?: ReactNode;
  gate?: GateStatus | null;
}) {
  const { record, card, status } = detail;
  const campus = refData.campuses.find((c) => c.id === record.campus_id)?.name;
  const dueRows: { label: string; value: string | null }[] = [
    { label: "Script due", value: record.script_due },
    { label: "Production due", value: record.production_due },
    { label: "Review due", value: record.review_due },
    { label: "Target publish", value: record.target_publish_date },
  ];

  return (
    <header className="space-y-4">
      {banner}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground font-mono text-xs">{record.content_id}</p>
          <h1 className="text-2xl font-semibold break-words">{record.title}</h1>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <StatusPill name={status?.name ?? record.status_key} colourKey={status?.colour_key} />
            <StageTimer enteredAt={card?.stage_entered_at} />
            <PriorityBadge priority={record.priority} />
            {card?.is_overdue ? (
              <Badge className="bg-red-600 text-white dark:bg-red-500">Overdue</Badge>
            ) : null}
            {card?.is_stalled ? (
              <Badge
                variant="outline"
                className="border-amber-500/50 text-amber-700 dark:text-amber-400"
              >
                Potentially stalled
              </Badge>
            ) : null}
            {gate && gate.open_hard_flag_count > 0 ? (
              <Badge className="bg-red-600 text-white dark:bg-red-500">
                <AlertTriangle className="size-3" aria-hidden /> {gate.open_hard_flag_count} open
                flag
                {gate.open_hard_flag_count === 1 ? "" : "s"}
              </Badge>
            ) : null}
            {gate && gate.open_change_requests > 0 ? (
              <Badge className="bg-orange-500 text-white">
                {gate.open_change_requests} change{gate.open_change_requests === 1 ? "" : "s"} open
              </Badge>
            ) : null}
            {record.requires_ai_disclosure ? (
              <Badge
                variant="outline"
                className="border-amber-500/50 text-amber-700 dark:text-amber-400"
              >
                <Sparkles className="size-3" aria-hidden /> AI disclosure
              </Badge>
            ) : null}
            {record.nepali_verification === "pending" ? (
              <Badge
                variant="outline"
                className="border-amber-500/50 text-amber-700 dark:text-amber-400"
              >
                <Languages className="size-3" aria-hidden /> Nepali verification pending
              </Badge>
            ) : record.nepali_verification === "verified" ? (
              <Badge
                variant="outline"
                className="border-emerald-500/50 text-emerald-700 dark:text-emerald-400"
              >
                <Languages className="size-3" aria-hidden /> Nepali verified
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="text-muted-foreground text-right text-xs">
          {card?.last_activity_at ? (
            <p>
              Updated {timeAgo(card.last_activity_at)}
              {card.last_activity_by ? ` by ${card.last_activity_by}` : ""}
            </p>
          ) : null}
          <p>Created {formatDate(record.created_at)}</p>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-2 rounded-md border p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-muted-foreground text-xs">Region · campus</dt>
          <dd className="flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden /> {record.region_code}
            {campus ? ` · ${campus}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Content type</dt>
          <dd>{card?.content_type ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">DM owner</dt>
          <dd>{card?.dm_owner_name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Production assignee</dt>
          <dd>{card?.assignee_name ?? "Unassigned"}</dd>
        </div>
        {dueRows.map((d) => (
          <div key={d.label}>
            <dt className="text-muted-foreground text-xs">{d.label}</dt>
            <dd className="flex items-center gap-1">
              <CalendarClock className="size-3.5" aria-hidden /> {formatDate(d.value)}
            </dd>
          </div>
        ))}
        <div className="sm:col-span-2 lg:col-span-4">
          <dt className="text-muted-foreground text-xs">Production folder</dt>
          <dd className="flex items-center gap-1">
            {record.production_folder_url ? (
              <>
                <Folder className="size-3.5" aria-hidden />
                <a
                  href={record.production_folder_url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate underline underline-offset-4"
                >
                  {record.production_folder_url}
                </a>
              </>
            ) : (
              <>
                <FolderX className="text-muted-foreground size-3.5" aria-hidden />
                <span className="text-muted-foreground">Not linked yet</span>
              </>
            )}
          </dd>
        </div>
      </dl>

      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
          Move stage
        </p>
        <StageActions contentId={record.id} transitions={detail.transitions} />
      </div>
    </header>
  );
}
