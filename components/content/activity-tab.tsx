import type { ActivityEntry } from "@/lib/content/queries";
import { formatDateTime } from "@/lib/workflow/statuses";

function priorityDiff(e: ActivityEntry): string | null {
  if (e.event_type !== "priority_change") return null;
  const prev = (e.previous_value as { priority?: string } | null)?.priority;
  const next = (e.new_value as { priority?: string } | null)?.priority;
  return prev && next ? `${prev} → ${next}` : null;
}

export function ActivityTab({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground rounded-md border p-6 text-center text-sm">
        No activity yet.
      </p>
    );
  }
  return (
    <ol className="relative space-y-4 border-l pl-5">
      {entries.map((e) => {
        const diff = priorityDiff(e);
        return (
          <li key={e.id} className="relative">
            <span
              className="bg-border absolute top-1.5 -left-[1.3rem] size-2 rounded-full"
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-sm">{e.description}</p>
              <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase">
                {e.event_type}
              </span>
            </div>
            <p className="text-muted-foreground text-xs" title={e.created_at}>
              {formatDateTime(e.created_at)}
              {e.actor_name ? ` · ${e.actor_name}` : ""}
              {diff ? ` · ${diff}` : ""}
            </p>
            {e.reason ? (
              <blockquote className="text-muted-foreground mt-1 border-l-2 pl-3 text-sm italic">
                Reason: {e.reason}
              </blockquote>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
