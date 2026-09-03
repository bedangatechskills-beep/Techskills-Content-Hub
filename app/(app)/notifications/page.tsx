import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/access.server";
import { getNotifications } from "@/lib/notifications/queries";
import { notificationHref } from "@/lib/notifications/links";
import { markAllNotificationsRead } from "@/lib/notifications/actions";
import { timeAgo } from "@/lib/workflow/statuses";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireActiveUser();
  const items = await getNotifications(100);
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="text-muted-foreground">
            In-app only in v1 (§97). Each one links into the record it came from.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await markAllNotificationsRead();
          }}
        >
          <Button type="submit" variant="outline" size="sm" disabled={unread === 0}>
            Mark all read
          </Button>
        </form>
      </div>
      <ul className="divide-y rounded-md border">
        {items.length === 0 ? (
          <li className="text-muted-foreground p-6 text-center text-sm">Nothing yet.</li>
        ) : null}
        {items.map((n) => (
          <li key={n.id} className={cn(!n.is_read && "bg-brand-blue/5")}>
            <Link href={notificationHref(n)} className="hover:bg-muted/60 block px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className={cn("text-sm", !n.is_read && "font-medium")}>{n.title}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {timeAgo(n.created_at)}
                </span>
              </div>
              {n.body ? <div className="text-muted-foreground text-xs">{n.body}</div> : null}
              <div className="text-muted-foreground mt-0.5 font-mono text-[10px]">{n.type}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
