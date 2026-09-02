import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/access.server";
import { listTeams } from "@/lib/admin/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Teams" };

export default async function TeamsPage() {
  await requirePermission("admin.users");
  const teams = await listTeams();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Teams</h1>
          <p className="text-muted-foreground">
            Working groups. A person can belong to several; roles are separate.
          </p>
        </div>
        <Button render={<Link href="/admin/teams/new" />}>
          <Plus className="size-4" /> New team
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Link href={`/admin/teams/${t.id}`} className="font-medium hover:underline">
                    {t.name}
                  </Link>
                  <div className="text-muted-foreground font-mono text-xs">{t.key}</div>
                </TableCell>
                <TableCell>
                  {t.supervisor?.full_name ?? <span className="text-muted-foreground">None</span>}
                </TableCell>
                <TableCell>{t.members.length}</TableCell>
                <TableCell>
                  {t.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
