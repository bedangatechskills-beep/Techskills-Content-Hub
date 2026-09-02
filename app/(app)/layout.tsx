import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/access.server";
import { visibleNav } from "@/lib/permissions/nav";
import { SidebarNav } from "@/components/shell/sidebar";
import { UserMenu } from "@/components/shell/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const access = await requireActiveUser();
  const items = visibleNav(access);

  return (
    <div className="flex min-h-screen">
      <aside className="border-sidebar-border bg-sidebar hidden w-60 shrink-0 flex-col border-r p-4 md:flex">
        <Link href="/" className="mb-6 block px-3">
          <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            TechSkills
          </p>
          <p className="text-base font-semibold">Content Hub</p>
        </Link>
        <div className="flex-1">
          <SidebarNav items={items} />
        </div>
        <UserMenu access={access} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 md:hidden">
          <Link href="/" className="font-semibold">
            Content Hub
          </Link>
          <nav className="flex gap-3 text-sm">
            {items.map((i) => (
              <Link key={i.href} href={i.href} className="text-muted-foreground">
                {i.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
