import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function PersonCell({
  profileId,
  name,
  photoUrl,
  subtitle,
}: {
  profileId: string;
  name: string;
  photoUrl?: string | null;
  subtitle?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
        <AvatarFallback className="bg-brand-blue text-[11px] font-semibold text-white">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <Link
          href={`/people/${profileId}/backlog`}
          className="block truncate font-medium hover:underline"
        >
          {name}
        </Link>
        {subtitle ? <div className="text-muted-foreground truncate text-xs">{subtitle}</div> : null}
      </div>
    </div>
  );
}
