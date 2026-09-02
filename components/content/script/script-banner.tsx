import { AlertTriangle } from "lucide-react";

/** SCRIPT CHANGED AFTER APPROVAL (§29). Shown on the record header. */
export function ScriptChangedBanner({
  currentNo,
  approvedNo,
  isMaterial,
}: {
  currentNo: number;
  approvedNo: number;
  /** null = author has not answered yet */
  isMaterial: boolean | null;
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/60 bg-amber-100 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      <span className="font-semibold tracking-wide">SCRIPT CHANGED AFTER APPROVAL</span>
      <span className="text-amber-900/80 dark:text-amber-200/80">
        V{currentNo} differs from approved V{approvedNo}.{" "}
        {isMaterial === null
          ? "The author must say whether the change is material (Script tab)."
          : isMaterial
            ? "Marked material: re-approval required."
            : "Marked non-material: the approval still covers it."}
      </span>
    </div>
  );
}
