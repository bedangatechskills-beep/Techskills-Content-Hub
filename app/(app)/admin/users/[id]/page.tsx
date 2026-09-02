import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/access.server";
import { getUser, listRoles, listTeams } from "@/lib/admin/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserForm } from "@/components/admin/user-form";
import { UserFlags } from "@/components/admin/user-flags";
import { UserLifecycle } from "@/components/admin/user-lifecycle";
import { StatusBadge } from "@/components/admin/status-badge";

export const metadata = { title: "User" };

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ warning?: string }>;
}) {
  const access = await requirePermission("admin.users");
  const [{ id }, { warning }] = await Promise.all([params, searchParams]);
  const [user, roles, teams] = await Promise.all([getUser(id), listRoles(), listTeams()]);
  if (!user) notFound();

  const isSelf = user.id === access.profile.id;
  const primaryTeamKey = teams.find((t) => t.id === user.primary_team_id)?.key ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeft className="size-3.5" /> All users
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{user.full_name}</h1>
          <StatusBadge status={user.account_status} />
          {isSelf ? <span className="text-muted-foreground text-sm">(this is you)</span> : null}
        </div>
        <p className="text-muted-foreground">{user.email}</p>
      </div>

      {warning ? (
        <Alert>
          <AlertTitle>Profile created with a warning</AlertTitle>
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,360px)]">
        <Card>
          <CardHeader>
            <CardTitle>Profile, role and teams</CardTitle>
            <CardDescription>
              Role decides what this person can do. Teams decide where they appear.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserForm roles={roles} teams={teams} user={user} primaryTeamKey={primaryTeamKey} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Flags</CardTitle>
              <CardDescription>Controlled independently of the role.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserFlags
                profileId={user.id}
                isSelf={isSelf}
                callerIsSuperAdmin={access.profile.is_super_admin}
                values={{
                  final_approver: user.is_final_approver,
                  super_admin: user.is_super_admin,
                  can_verify_nepali: user.can_verify_nepali,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                {user.last_login_at
                  ? `Last login ${new Date(user.last_login_at).toLocaleString()}`
                  : "Has never logged in"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserLifecycle profileId={user.id} status={user.account_status} isSelf={isSelf} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
