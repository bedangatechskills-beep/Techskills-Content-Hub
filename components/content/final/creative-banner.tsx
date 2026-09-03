import { AlertTriangle } from "lucide-react";

/** CREATIVE CHANGED AFTER FINAL APPROVAL (§52). Shown on the record header. */
export function CreativeChangedBanner({ pending }: { pending: boolean }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/60 bg-amber-100 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      <span className="font-semibold tracking-wide">CREATIVE CHANGED AFTER FINAL APPROVAL</span>
      <span className="text-amber-900/80 dark:text-amber-200/80">
        {pending
          ? "The current creative differs from the one the CEO approved. Say whether the change is material (Reviews tab)."
          : "Classified as material: CEO re-approval required. The previous approval stays in history."}
      </span>
    </div>
  );
}
