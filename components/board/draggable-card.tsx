"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { KanbanCardRow } from "@/lib/supabase/database.types";
import { KanbanCard } from "./kanban-card";

export function DraggableCard({ card, dragging }: { card: KanbanCardRow; dragging: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: card.id ?? card.content_id ?? "",
    data: { card },
  });
  return (
    <KanbanCard
      ref={setNodeRef}
      card={card}
      dragging={dragging}
      style={{ transform: CSS.Translate.toString(transform) }}
      className="cursor-grab touch-none active:cursor-grabbing"
      {...listeners}
      {...attributes}
    />
  );
}
