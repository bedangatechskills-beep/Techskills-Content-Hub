import { AlertTriangle, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_CLASS, PRIORITY_LABEL } from "@/lib/workflow/statuses";

/** Urgent is clearly indicated but never overrides the workflow colour (§95). */
export function PriorityBadge({
  priority,
  className,
}: {
  priority: string | null | undefined;
  className?: string;
}) {
  const p = priority ?? "normal";
  if (p === "normal" || p === "low") {
    return <span className={cn("text-xs", PRIORITY_CLASS[p], className)}>{PRIORITY_LABEL[p]}</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", PRIORITY_CLASS[p], className)}>
      {p === "urgent" ? (
        <AlertTriangle className="size-3" aria-hidden />
      ) : (
        <ArrowUp className="size-3" aria-hidden />
      )}
      {PRIORITY_LABEL[p]}
    </span>
  );
}
