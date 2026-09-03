"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setWorkStatus } from "@/lib/production/actions";
import type { WorkStatus } from "@/lib/supabase/database.types";

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  available: "Available",
  working: "Working",
  reviewing: "Reviewing",
  editing: "Editing",
  recording: "Recording",
  meeting: "Meeting",
  waiting_for_feedback: "Waiting for feedback",
  waiting_for_approval: "Waiting for approval",
  deadline_risk: "Deadline risk",
  away: "Away",
  offline: "Offline",
};

export function WorkStatusSelect({ value, editable }: { value: WorkStatus; editable: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (!editable) {
    return (
      <span className="bg-secondary text-secondary-foreground inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium">
        {WORK_STATUS_LABEL[value] ?? value}
      </span>
    );
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Work status</span>
      <select
        aria-label="Work status"
        value={value}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            const result = await setWorkStatus(e.target.value as WorkStatus);
            if (result?.error) toast.error(result.error);
            else {
              toast.success(result?.success ?? "Updated");
              router.refresh();
            }
          })
        }
        className="border-input bg-background h-8 rounded-full border px-2.5 text-xs font-medium shadow-xs"
      >
        {(Object.keys(WORK_STATUS_LABEL) as WorkStatus[]).map((k) => (
          <option key={k} value={k}>
            {WORK_STATUS_LABEL[k]}
          </option>
        ))}
      </select>
    </label>
  );
}
