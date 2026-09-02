import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
    <div className="border-sidebar-border flex items-center gap-3 border-t pt-4">
      <Avatar>
        {profile.photo_url ? <AvatarImage src={profile.photo_url} alt="" /> : null}
        <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{profile.full_name}</p>
        <div className="flex flex-wrap gap-1 pt-0.5">
          {role ? <Badge variant="secondary">{role.name}</Badge> : null}
          {profile.is_final_approver ? <Badge>Final Approver</Badge> : null}
        </div>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Sign out" title="Sign out">
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}
