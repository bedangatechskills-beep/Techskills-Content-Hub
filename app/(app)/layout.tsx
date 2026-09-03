import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/access.server";
import { visibleNav } from "@/lib/permissions/nav";
import { SidebarNav } from "@/components/shell/sidebar";
import { UserMenu } from "@/components/shell/user-menu";
import { BrandLogo } from "@/components/shell/brand-logo";
import { NotificationBell } from "@/components/shell/notification-bell";
import { getNotifications, getUnreadCount } from "@/lib/notifications/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const access = await requireActiveUser();
  const items = visibleNav(access);
  const [unread, notifications] = await Promise.all([getUnreadCount(), getNotifications(8)]);
  const bell = (
    <NotificationBell profileId={access.profile.id} unread={unread} items={notifications} />
  );

  return (
    <div className="flex min-h-screen">
      <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 flex-col md:flex">
        <div className="border-sidebar-border border-b px-5 py-5">
          <Link href="/" className="block">
            <BrandLogo variant="light" />
          </Link>
        </div>
        <div className="flex-1 px-3 py-4">
          <p className="text-sidebar-foreground/50 mb-2 px-3 text-[10px] font-semibold tracking-[0.18em] uppercase">
            Workspace
          </p>
          <SidebarNav items={items} />
        </div>
        <div className="border-sidebar-border flex items-center gap-2 border-t px-4 py-4">
          <div className="min-w-0 flex-1">
            <UserMenu access={access} />
          </div>
          {bell}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-brand-navy text-white md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/">
              <BrandLogo variant="light" />
            </Link>
            {bell}
          </div>
          <nav className="flex gap-4 overflow-x-auto px-4 pb-3 text-sm">
            {items.map((i) => (
              <Link key={i.href} href={i.href} className="whitespace-nowrap text-white/80">
                {i.label}
              </Link>
            ))}
          </nav>
        </header>
        <div className="bg-brand-blue h-1 w-full md:block" aria-hidden />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
