"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { moveStage } from "@/lib/content/actions";
import type { KanbanCardRow, WorkflowStatusRow } from "@/lib/supabase/database.types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { KanbanCard } from "./kanban-card";
import { KanbanColumn } from "./kanban-column";
import { ReasonDialog } from "./reason-dialog";

interface PendingMove {
  cardId: string;
  fromStatus: string;
  toStatus: string;
  toName: string;
}

const REASON_NEEDED = /reason is required/i;

export function KanbanBoard({
  statuses,
  cards,
}: {
  statuses: WorkflowStatusRow[];
  cards: KanbanCardRow[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<KanbanCardRow[]>(cards);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [reasonFor, setReasonFor] = useState<PendingMove | null>(null);
  const [pending, start] = useTransition();

  // Server data wins whenever the page re-renders (router.refresh after a move).
  useEffect(() => setItems(cards), [cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const ordered = useMemo(
    () =>
      [...statuses]
        .sort((a, b) => a.sort_order - b.sort_order)
        .filter((s) => showArchived || s.key !== "archived"),
    [statuses, showArchived],
  );

  const byStatus = useMemo(() => {
    const m = new Map<string, KanbanCardRow[]>();
    for (const s of statuses) m.set(s.key, []);
    for (const c of items) {
      if (!c.status_key) continue;
      const list = m.get(c.status_key);
      if (list) list.push(c);
    }
    return m;
  }, [items, statuses]);

  const activeCard = activeId ? (items.find((c) => c.id === activeId) ?? null) : null;

  function setCardStatus(cardId: string, statusKey: string) {
    const s = statuses.find((x) => x.key === statusKey);
    setItems((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              status_key: statusKey,
              status_name: s?.name ?? c.status_name,
              colour_key: s?.colour_key ?? c.colour_key,
              status_order: s?.sort_order ?? c.status_order,
            }
          : c,
      ),
    );
  }

  function performMove(move: PendingMove, reason?: string) {
    start(async () => {
      const result = await moveStage(move.cardId, move.toStatus, reason);
      if (result?.error) {
        if (!reason && REASON_NEEDED.test(result.error)) {
          // Keep the optimistic position while we ask; roll back on cancel.
          setReasonFor(move);
          return;
        }
        setCardStatus(move.cardId, move.fromStatus);
        setReasonFor(null);
        toast.error(result.error);
        return;
      }
      setReasonFor(null);
      toast.success(`Moved to ${move.toName}`);
      router.refresh();
    });
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const cardId = String(e.active.id);
    const toStatus = e.over ? String(e.over.id) : null;
    const card = items.find((c) => c.id === cardId);
    if (!card || !toStatus || !card.status_key || toStatus === card.status_key) return;
    const target = statuses.find((s) => s.key === toStatus);
    if (!target) return;

    const move: PendingMove = {
      cardId,
      fromStatus: card.status_key,
      toStatus,
      toName: target.name,
    };
    setCardStatus(cardId, toStatus);
    performMove(move);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
        <Label htmlFor="show-archived" className="text-xs font-normal">
          Show archived column
        </Label>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div
          className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-4"
          role="list"
          aria-label="Workflow stages"
        >
          {ordered.map((s) => (
            <KanbanColumn
              key={s.key}
              status={s}
              cards={byStatus.get(s.key) ?? []}
              activeId={activeId}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeCard ? <KanbanCard card={activeCard} overlay className="w-[244px]" /> : null}
        </DragOverlay>
      </DndContext>

      <ReasonDialog
        open={reasonFor !== null}
        title={reasonFor ? `Move to ${reasonFor.toName}` : "Reason required"}
        description="This move goes backward or requests changes, so a reason is mandatory."
        pending={pending}
        onCancel={() => {
          if (reasonFor) setCardStatus(reasonFor.cardId, reasonFor.fromStatus);
          setReasonFor(null);
        }}
        onSubmit={(reason) => {
          if (reasonFor) performMove(reasonFor, reason);
        }}
      />
    </div>
  );
}
