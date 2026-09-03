"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Clapperboard,
  Columns3,
  Eye,
  FileText,
  LayoutDashboard,
  Library,
  ListTodo,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/permissions/nav";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/": LayoutDashboard,
  "/board": Columns3,
  "/content": FileText,
  "/approvals/scripts": CheckSquare,
  "/reviews/dm": Eye,
  "/team": UsersRound,
  "/me": ListTodo,
  "/production": Clapperboard,
  "/admin/reference": Library,
  "/admin/users": Users,
  "/admin/teams": UsersRound,
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = ICONS[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            {active ? (
              <span
                className="bg-sidebar-primary absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full"
                aria-hidden
              />
            ) : null}
            {Icon ? <Icon className="size-4 shrink-0 opacity-90" /> : null}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
