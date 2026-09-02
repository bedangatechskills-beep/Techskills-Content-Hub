import { can, type Access, type PermissionKey } from "./access";

export interface NavItem {
  href: string;
  label: string;
  /** Shown to every active user when omitted. */
  requires?: PermissionKey;
  /** Later phases mark items here so the shell can render them dimmed. */
  phase?: number;
}

// Names bind to permissions, never to roles or people. Items that need a
// permission the caller lacks are removed, not just hidden (§106 still holds
// server-side: every page re-checks).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/board", label: "Board" },
  { href: "/content", label: "Content" },
  { href: "/admin/reference", label: "Reference data", requires: "admin.reference_data" },
  { href: "/admin/users", label: "Users", requires: "admin.users" },
  { href: "/admin/teams", label: "Teams", requires: "admin.users" },
];

export function visibleNav(access: Access | null): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.requires || can(access, item.requires));
}
