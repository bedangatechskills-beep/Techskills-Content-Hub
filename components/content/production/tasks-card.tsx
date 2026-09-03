"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createTask, setTaskStatus } from "@/lib/production/actions";
import type { TaskEntry } from "@/lib/production/queries";
import type { TaskStatus } from "@/lib/supabase/database.types";
import { formatDate, formatDateTime } from "@/lib/workflow/statuses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PriorityBadge } from "@/components/content/priority-badge";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";
import { cn } from "@/lib/utils";

const selectClass =
  "border-input bg-background h-8 rounded-md border px-2 text-xs shadow-xs disabled:opacity-60";
const CATEGORIES = [
  "check script",
  "organise recording",
  "record",
  "edit",
  "subtitles",
  "thumbnail",
  "platform versions",
  "upload review version",
];
const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

export function TasksCard({
  contentId,
  code,
  tasks,
  people,
  recordAssigneeId,
  selfId,
  canManage,
  canWork,
}: {
  contentId: string;
  code: string;
  tasks: TaskEntry[];
  people: { id: string; full_name: string }[];
  recordAssigneeId: string | null;
  selfId: string;
  canManage: boolean;
  canWork: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [state, action] = useActionState(createTask, null);
  const open = tasks.filter((t) => t.status === "todo" || t.status === "in_progress").length;
  const today = new Date().toISOString().slice(0, 10);

  function change(task: TaskEntry, status: TaskStatus) {
    start(async () => {
      const r = await setTaskStatus(task.id, status, code);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Updated");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Tasks{" "}
          <span className="text-muted-foreground text-sm font-normal">
            {open} open · {tasks.length} total
          </span>
        </CardTitle>
        <CardDescription>Task creation and completion are logged in Activity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tasks yet.</p>
        ) : (
          <ul className="divide-y">
            {tasks.map((t) => {
              const editable =
                canManage || (canWork && (t.assignee_id === selfId || recordAssigneeId === selfId));
              const overdue =
                !!t.due_date &&
                t.due_date < today &&
                t.status !== "done" &&
                t.status !== "cancelled";
              return (
                <li key={t.id} className="flex flex-col gap-1 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "font-medium",
                          (t.status === "done" || t.status === "cancelled") &&
                            "text-muted-foreground line-through",
                        )}
                      >
                        {t.title}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t.category ? `${t.category} · ` : ""}
                        {t.assignee_name ?? "Unassigned"}
                        {t.due_date ? (
                          <>
                            {" · "}
                            <span className={cn(overdue && "text-destructive font-medium")}>
                              {overdue ? "Overdue · " : "Due "}
                              {formatDate(t.due_date)}
                            </span>
                          </>
                        ) : null}
                        {t.completed_at ? ` · done ${formatDateTime(t.completed_at)}` : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PriorityBadge priority={t.priority} />
                      <label className="sr-only" htmlFor={`task-status-${t.id}`}>
                        Status of {t.title}
                      </label>
                      <select
                        id={`task-status-${t.id}`}
                        className={selectClass}
                        value={t.status}
                        disabled={!editable || pending}
                        onChange={(e) => change(t, e.target.value as TaskStatus)}
                      >
                        {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {t.description ? (
                    <p className="text-muted-foreground text-xs">{t.description}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {canWork ? (
          showForm ? (
            <form action={action} className="space-y-3 rounded-md border p-3">
              <input type="hidden" name="content_id" value={contentId} />
              <input type="hidden" name="content_code" value={code} />
              <div className="space-y-1">
                <Label htmlFor="task-title">Title</Label>
                <Input id="task-title" name="title" required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="task-category">Category</Label>
                  <Input id="task-category" name="category" list="task-categories" />
                  <datalist id="task-categories">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="task-priority">Priority</Label>
                  <select
                    id="task-priority"
                    name="priority"
                    defaultValue="normal"
                    className={cn(selectClass, "h-9 w-full text-sm")}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                {canManage ? (
                  <div className="space-y-1">
                    <Label htmlFor="task-assignee">Assignee</Label>
                    <select
                      id="task-assignee"
                      name="assignee_id"
                      defaultValue=""
                      className={cn(selectClass, "h-9 w-full text-sm")}
                    >
                      <option value="">Record assignee</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className="space-y-1">
                  <Label htmlFor="task-due">Due date</Label>
                  <Input id="task-due" name="due_date" type="date" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="task-start">Start date</Label>
                  <Input id="task-start" name="start_date" type="date" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="task-description">Description</Label>
                <Textarea id="task-description" name="description" rows={2} />
              </div>
              <FormMessage state={state} />
              <div className="flex gap-2">
                <SubmitButton size="sm" pendingText="Adding…">
                  Add task
                </SubmitButton>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                  Close
                </Button>
              </div>
            </form>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="size-4" aria-hidden /> Add task
            </Button>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
