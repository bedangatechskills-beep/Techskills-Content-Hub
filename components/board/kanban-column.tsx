"use client";

import { useDroppable } from "@dnd-kit/core";
import type { KanbanCardRow, WorkflowStatusRow } from "@/lib/supabase/database.types";
import { statusStyle } from "@/lib/workflow/statuses";
import { cn } from "@/lib/utils";
import { DraggableCard } from "./draggable-card";

export function KanbanColumn({
  status,
  cards,
  activeId,
}: {
  status: WorkflowStatusRow;
  cards: KanbanCardRow[];
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.key });
  const style = statusStyle(status.colour_key);

  return (
    <section
      ref={setNodeRef}
      aria-label={`${status.name} column, ${cards.length} item${cards.length === 1 ? "" : "s"}`}
      className={cn(
        "flex w-[260px] min-w-[260px] shrink-0 flex-col rounded-lg border transition-colors",
        style.column,
        isOver && "ring-ring/50 ring-2",
      )}
    >
      <header className="p-3 pb-2">
        <div className={cn("mb-2 h-1 rounded-full", style.bar)} aria-hidden />
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{status.name}</h2>
          <span className="text-muted-foreground bg-background/70 rounded-full px-2 py-0.5 text-xs">
            {cards.length}
          </span>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} dragging={activeId === c.id} />
        ))}
        {cards.length === 0 ? (
          <p className="text-muted-foreground rounded-md border border-dashed px-2 py-6 text-center text-xs">
            Nothing here
          </p>
        ) : null}
      </div>
    </section>
  );
}
