import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/content/status-pill";
import { PriorityBadge } from "@/components/content/priority-badge";
import { formatDate, formatDuration } from "@/lib/workflow/statuses";
import type { BacklogItem } from "@/lib/production/queries";

export function BacklogItemRow({
  item,
  showHolder = false,
}: {
  item: BacklogItem;
  showHolder?: boolean;
}) {
  const code = item.content_id ?? "";
  const holder = item.assignee_name ?? item.dm_owner_name ?? null;
  return (
    <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/content/${code}`}
            className="text-primary font-mono text-xs underline-offset-4 hover:underline"
          >
            {code}
          </Link>
          <span className="truncate font-medium">{item.title}</span>
        </div>
        {item.item_kind === "task" && item.task_title ? (
          <p className="text-muted-foreground text-xs">Task: {item.task_title}</p>
        ) : null}
        {showHolder && holder ? (
          <p className="text-muted-foreground text-xs">With {holder}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {item.status_name ? (
          <StatusPill name={item.status_name} colourKey={item.colour_key} size="sm" />
        ) : null}
        <PriorityBadge priority={item.priority} />
        {item.due_date ? (
          <span
            className={
              item.is_overdue
                ? "font-medium text-red-700 dark:text-red-400"
                : "text-muted-foreground"
            }
          >
            {item.is_overdue ? "Overdue · " : "Due "}
            {formatDate(item.due_date)}
          </span>
        ) : null}
        {item.seconds_in_stage != null ? (
          <span className="text-muted-foreground">
            in stage for {formatDuration(item.seconds_in_stage)}
          </span>
        ) : null}
        {item.is_stalled ? (
          <Badge
            variant="outline"
            className="border-amber-500/50 text-amber-700 dark:text-amber-400"
          >
            <AlertTriangle className="size-3" aria-hidden /> Potentially stalled
          </Badge>
        ) : null}
      </div>
    </li>
  );
}
