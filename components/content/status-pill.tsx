import { cn } from "@/lib/utils";
import { statusStyle } from "@/lib/workflow/statuses";

/** Status colour + label together, never colour alone (§60). */
export function StatusPill({
  name,
  colourKey,
  className,
  size = "md",
}: {
  name: string;
  colourKey: string | null | undefined;
  className?: string;
  size?: "sm" | "md";
}) {
  const s = statusStyle(colourKey);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        s.pill,
        className,
      )}
    >
      {name}
    </span>
  );
}
