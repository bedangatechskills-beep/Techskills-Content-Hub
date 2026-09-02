import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActionState } from "@/lib/auth/actions";

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.error && !state?.success) return null;
  const isError = !!state.error;
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
        isError
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-emerald-600/30 bg-emerald-600/5 text-emerald-700 dark:text-emerald-400"
      }`}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{state.error ?? state.success}</span>
    </p>
  );
}
