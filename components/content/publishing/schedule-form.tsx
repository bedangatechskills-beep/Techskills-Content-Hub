"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { scheduleContent, type ScheduleItemInput } from "@/lib/publishing/actions";
import type { ScheduleWithNames } from "@/lib/publishing/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { selectClass } from "@/components/content/select-field";

interface Row {
  key: string;
  platform_id: string;
  local: string; // datetime-local value
  publisher_id: string;
  notes: string;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Schedule rows per platform (§53). Editing a date asks for a reason (§63). */
export function ScheduleForm({
  contentId,
  code,
  statusKey,
  existing,
  platforms,
  publishers,
  contentPlatformIds,
  defaultPublisherId,
}: {
  contentId: string;
  code: string;
  statusKey: string;
  existing: ScheduleWithNames[];
  platforms: { id: string; name: string }[];
  publishers: { id: string; full_name: string }[];
  contentPlatformIds: string[];
  defaultPublisherId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const initial: Row[] = existing.length
    ? existing.map((s) => ({
        key: s.id,
        platform_id: s.platform_id,
        local: toLocalInput(s.scheduled_at),
        publisher_id: s.publisher_id ?? "",
        notes: s.notes ?? "",
      }))
    : (contentPlatformIds.length ? contentPlatformIds : platforms.slice(0, 1).map((p) => p.id)).map(
        (pid) => ({
          key: pid,
          platform_id: pid,
          local: "",
          publisher_id: defaultPublisherId ?? "",
          notes: "",
        }),
      );
  const [rows, setRows] = useState<Row[]>(initial);
  const [reason, setReason] = useState("");
  const editing = statusKey === "scheduled";
  const dateChanged = editing
    ? rows.some((r) => {
        const was = existing.find((s) => s.platform_id === r.platform_id);
        return !was || toLocalInput(was.scheduled_at) !== r.local;
      }) || existing.some((s) => !rows.find((r) => r.platform_id === s.platform_id))
    : false;

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    const used = new Set(rows.map((r) => r.platform_id));
    const next = platforms.find((p) => !used.has(p.id));
    if (!next) return;
    setRows((rs) => [
      ...rs,
      {
        key: `${next.id}-${Date.now()}`,
        platform_id: next.id,
        local: rs[0]?.local ?? "",
        publisher_id: rs[0]?.publisher_id ?? defaultPublisherId ?? "",
        notes: "",
      },
    ]);
  }

  function submit() {
    const items: ScheduleItemInput[] = rows.map((r) => ({
      platform_id: r.platform_id,
      scheduled_at: r.local ? new Date(r.local).toISOString() : "",
      publisher_id: r.publisher_id || null,
      notes: r.notes,
    }));
    if (items.some((i) => !i.scheduled_at)) {
      toast.error("Every platform needs a date and time");
      return;
    }
    if (dateChanged && !reason.trim()) {
      toast.error("Give a reason for changing the publishing date");
      return;
    }
    start(async () => {
      const r = await scheduleContent(contentId, code, items, reason || undefined);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Saved");
        setReason("");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4" aria-hidden />
          {editing ? "Schedule" : "Schedule for publishing"}
        </CardTitle>
        <CardDescription>
          One row per platform with date, time and publisher. Times are entered in your local time
          zone.{" "}
          {editing
            ? "Changing a date is logged with a reason."
            : "Saving moves the record to Scheduled."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((r, i) => (
          <div
            key={r.key}
            className="grid gap-3 rounded-md border p-3 md:grid-cols-[1.2fr_1.4fr_1.2fr_auto]"
          >
            <div className="space-y-1">
              <Label htmlFor={`platform-${i}`}>Platform</Label>
              <select
                id={`platform-${i}`}
                className={selectClass}
                value={r.platform_id}
                onChange={(e) => update(i, { platform_id: e.target.value })}
              >
                {platforms.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={rows.some((o, j) => j !== i && o.platform_id === p.id)}
                  >
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`when-${i}`}>Date and time</Label>
              <Input
                id={`when-${i}`}
                type="datetime-local"
                value={r.local}
                onChange={(e) => update(i, { local: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`publisher-${i}`}>Publisher</Label>
              <select
                id={`publisher-${i}`}
                className={selectClass}
                value={r.publisher_id}
                onChange={(e) => update(i, { publisher_id: e.target.value })}
              >
                <option value="">Any publisher</option>
                {publishers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove platform"
                disabled={rows.length === 1}
                onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label htmlFor={`notes-${i}`}>Scheduling notes</Label>
              <Input
                id={`notes-${i}`}
                value={r.notes}
                onChange={(e) => update(i, { notes: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={rows.length >= platforms.length}
          >
            <Plus className="size-4" aria-hidden /> Add platform
          </Button>
        </div>
        {dateChanged ? (
          <div className="space-y-1">
            <Label htmlFor="schedule-reason">Reason for the change (required)</Label>
            <Textarea
              id="schedule-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        ) : null}
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : editing ? "Save schedule" : "Schedule"}
        </Button>
      </CardContent>
    </Card>
  );
}
