import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/access.server";
import { getTeam, listProfileOptions } from "@/lib/admin/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamForm } from "@/components/admin/team-form";
import { TeamMembers } from "@/components/admin/team-members";

export const metadata = { title: "Team" };

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("admin.users");
  const { id } = await params;
  const [team, people] = await Promise.all([getTeam(id), listProfileOptions()]);
  if (!team) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/teams"
          className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeft className="size-3.5" /> All teams
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{team.name}</h1>
          {team.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
        </div>
        {team.description ? <p className="text-muted-foreground">{team.description}</p> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Name, supervisor and status.</CardDescription>
          </CardHeader>
          <CardContent>
            <TeamForm team={team} people={people} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Members ({team.members.length})</CardTitle>
            <CardDescription>Tick everyone who belongs to this team.</CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMembers
              teamId={team.id}
              memberIds={team.members.map((m) => m.id)}
              people={people}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
