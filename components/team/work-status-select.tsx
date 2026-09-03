"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { setWorkStatus } from "@/lib/production/actions";
import type { WorkStatus } from "@/lib/supabase/database.types";
import { WORK_STATUS_LABEL } from "./workload-badge";

const VALUES: WorkStatus[] = [
  "available",
  "working",
  "reviewing",
  "editing",
  "recording",
  "meeting",
  "waiting_for_feedback",
  "waiting_for_approval",
  "deadline_risk",
  "away",
  "offline",
];

/** Editable only by the person themselves (§83). */
export function WorkStatusSelect({ value }: { value: string | null | undefined }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="My work status"
      value={value ?? "offline"}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as WorkStatus;
        start(async () => {
          const r = await setWorkStatus(next);
          if (r?.error) toast.error(r.error);
          else {
            toast.success("Work status updated");
            router.refresh();
          }
        });
      }}
      className="border-input bg-background h-7 rounded-md border px-2 text-xs shadow-xs"
    >
      {VALUES.map((v) => (
        <option key={v} value={v}>
          {WORK_STATUS_LABEL[v]}
        </option>
      ))}
    </select>
  );
}
