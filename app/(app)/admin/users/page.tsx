import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/access.server";
import { listUsers } from "@/lib/admin/queries";
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
import { StatusBadge } from "@/components/admin/status-badge";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  await requirePermission("admin.users");
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="text-muted-foreground">
            Staff profiles, roles and flags. Users are disabled, never deleted.
          </p>
        </div>
        <Button render={<Link href="/admin/users/new" />}>
          <Plus className="size-4" /> Invite user
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Teams</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                    {u.full_name}
                  </Link>
                  <div className="text-muted-foreground text-xs">{u.email}</div>
                </TableCell>
                <TableCell>
                  {u.role?.name ?? <span className="text-muted-foreground">None</span>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.teams.map((t) => (
                      <Badge key={t.id} variant="secondary">
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.is_final_approver ? <Badge>Final Approver</Badge> : null}
                    {u.is_super_admin ? <Badge variant="outline">Super Admin</Badge> : null}
                    {u.can_verify_nepali ? <Badge variant="outline">Nepali</Badge> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={u.account_status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center">
                  No users yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
