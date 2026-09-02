"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { AlertCircle, FileText, FolderOpen, MessageSquare } from "lucide-react";
import type { KanbanCardRow } from "@/lib/supabase/database.types";
import { formatDate, timeAgo } from "@/lib/workflow/statuses";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/components/content/priority-badge";

export interface KanbanCardProps extends React.HTMLAttributes<HTMLDivElement> {
  card: KanbanCardRow;
  dragging?: boolean;
  overlay?: boolean;
}

/** Card contents per §61. Compact and readable; colour never stands alone. */
export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(function KanbanCard(
  { card, dragging, overlay, className, ...rest },
  ref,
) {
  const diffs = card.differentiators ?? [];
  const shownDiffs = diffs.slice(0, 3);
  const extraDiffs = diffs.length - shownDiffs.length;
  const person = card.assignee_name ?? card.dm_owner_name;
  const scriptStatus = card.script_approved
    ? "Script approved"
    : card.has_script
      ? "Script drafted"
      : null;

  return (
    <div
      ref={ref}
      className={cn(
        "bg-card text-card-foreground rounded-lg border p-3 shadow-xs transition-shadow",
        dragging && !overlay && "opacity-40",
        overlay && "ring-ring/40 shadow-lg ring-2",
        className,
      )}
      {...rest}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/content/${card.content_id}`}
          className="text-muted-foreground font-mono text-[11px] hover:underline"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {card.content_id}
        </Link>
        <PriorityBadge priority={card.priority} />
      </div>

      <Link
        href={`/content/${card.content_id}`}
        className="mt-1 block text-sm leading-snug font-medium hover:underline"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {card.title}
      </Link>

      <p className="text-muted-foreground mt-1 truncate text-xs">
        {card.content_type}
        {card.platforms && card.platforms.length ? ` · ${card.platforms.join(", ")}` : ""}
      </p>
      {card.objective ? (
        <p className="text-muted-foreground truncate text-xs">{card.objective}</p>
      ) : null}

      {shownDiffs.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {shownDiffs.map((d) => (
            <span key={d} className="bg-muted rounded px-1.5 py-0.5 text-[10px] leading-4">
              {d}
            </span>
          ))}
          {extraDiffs > 0 ? (
            <span className="text-muted-foreground px-1 text-[10px] leading-5">+{extraDiffs}</span>
          ) : null}
        </div>
      ) : null}

      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {person ? (
          <span className="truncate">{person}</span>
        ) : (
          <span className="italic">Unassigned</span>
        )}
        {card.due_date ? (
          <span className={cn(card.is_overdue && "font-medium text-red-600 dark:text-red-400")}>
            {card.is_overdue ? "Overdue · " : "Due "}
            {formatDate(card.due_date)}
          </span>
        ) : null}
      </div>

      <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
        {card.comment_count ? (
          <span className="inline-flex items-center gap-1" title="Comments">
            <MessageSquare className="size-3" aria-hidden />
            {card.comment_count}
          </span>
        ) : null}
        {card.has_folder ? (
          <span className="inline-flex items-center gap-1" title="Production folder linked">
            <FolderOpen className="size-3" aria-hidden />
            Folder
          </span>
        ) : null}
        {scriptStatus ? (
          <span className="inline-flex items-center gap-1" title={scriptStatus}>
            <FileText className="size-3" aria-hidden />
            {scriptStatus}
          </span>
        ) : null}
      </div>

      {card.is_stalled ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          <AlertCircle className="size-3" aria-hidden />
          Potentially stalled
        </p>
      ) : null}

      {card.last_activity_at ? (
        <p className="text-muted-foreground mt-2 text-[11px]">
          Updated {timeAgo(card.last_activity_at)}
          {card.last_activity_by ? ` by ${card.last_activity_by}` : ""}
        </p>
      ) : null}
    </div>
  );
});
