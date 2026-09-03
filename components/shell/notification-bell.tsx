"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications/actions";
import { notificationHref, type NotificationItem } from "@/lib/notifications/links";
import { timeAgo } from "@/lib/workflow/statuses";
import { cn } from "@/lib/utils";

/** Unread count, latest items, mark read, deep links (§97). Realtime keeps the count live. */
export function NotificationBell({
  profileId,
  unread,
  items,
}: {
  profileId: string;
  unread: number;
  items: NotificationItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const bump = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };
    const channel = supabase
      .channel(`notifications-${profileId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${profileId}`,
        },
        bump,
      )
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [profileId, router]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-sidebar-foreground/80 hover:bg-sidebar-accent relative inline-flex size-9 items-center justify-center rounded-md hover:text-white"
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span
            className="bg-brand-orange absolute -top-0.5 -right-0.5 min-w-[18px] rounded-full px-1 text-center text-[10px] leading-[18px] font-semibold text-white"
            data-testid="unread-count"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="bg-popover text-popover-foreground absolute bottom-11 left-0 z-50 w-80 rounded-md border shadow-lg md:top-11 md:right-0 md:bottom-auto md:left-auto"
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">Notifications</span>
            <button
              type="button"
              className="text-muted-foreground inline-flex items-center gap-1 text-xs hover:underline disabled:opacity-50"
              disabled={pending || unread === 0}
              onClick={() =>
                start(async () => {
                  await markAllNotificationsRead();
                  router.refresh();
                })
              }
            >
              <CheckCheck className="size-3" aria-hidden /> Mark all read
            </button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <li className="text-muted-foreground px-3 py-6 text-center text-sm">Nothing yet.</li>
            ) : null}
            {items.map((n) => (
              <li
                key={n.id}
                className={cn("border-b last:border-0", !n.is_read && "bg-brand-blue/5")}
              >
                <Link
                  href={notificationHref(n)}
                  onClick={() => {
                    setOpen(false);
                    if (!n.is_read) start(async () => void (await markNotificationRead(n.id)));
                  }}
                  className="hover:bg-muted/60 block px-3 py-2 text-sm"
                >
                  <div className={cn("leading-snug", !n.is_read && "font-medium")}>{n.title}</div>
                  {n.body ? (
                    <div className="text-muted-foreground line-clamp-2 text-xs">{n.body}</div>
                  ) : null}
                  <div className="text-muted-foreground mt-0.5 text-[11px]">
                    {timeAgo(n.created_at)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t px-3 py-2 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs hover:underline"
            >
              See all
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
