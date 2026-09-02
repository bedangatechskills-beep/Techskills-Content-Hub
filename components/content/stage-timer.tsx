"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/workflow/statuses";

/** Live "At this stage: 4 hrs 26 mins" (§69). */
export function StageTimer({
  enteredAt,
  prefix = "At this stage: ",
}: {
  enteredAt: string | null | undefined;
  prefix?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!enteredAt) return null;
  const seconds = Math.max(0, Math.floor((now - new Date(enteredAt).getTime()) / 1000));
  return (
    <span className="text-muted-foreground text-xs" title={new Date(enteredAt).toLocaleString()}>
      {prefix}
      {formatDuration(seconds)}
    </span>
  );
}
