import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Access } from "@/lib/permissions/access";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ access }: { access: Access }) {
  const { profile, role } = access;
  return (
    <div className="flex items-center gap-3">
      <Avatar className="ring-brand-orange/70 ring-2">
        {profile.photo_url ? <AvatarImage src={profile.photo_url} alt="" /> : null}
        <AvatarFallback className="bg-brand-blue text-xs font-semibold text-white">
          {initials(profile.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
        <p className="text-sidebar-foreground/60 truncate text-[11px]">
          {role?.name ?? "No role"}
          {profile.is_final_approver ? " · Final Approver" : ""}
        </p>
      </div>
      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          title="Sign out"
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
        >
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}
