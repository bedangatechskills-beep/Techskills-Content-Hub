import { requireActiveUser } from "@/lib/auth/access.server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const access = await requireActiveUser();
  const { profile, role, teams, permissions } = access;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hello, {profile.full_name.split(" ")[0]}</h1>
        <p className="text-muted-foreground">
          Role dashboards arrive in Phase 6. This placeholder shows what the system loaded for you
          at sign-in.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Role</CardTitle>
            <CardDescription>Assigned by an administrator</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">{role?.name ?? "No role"}</Badge>
            {profile.is_final_approver ? <Badge>Final Approver</Badge> : null}
            {profile.is_super_admin ? <Badge variant="outline">Super Admin</Badge> : null}
            {profile.can_verify_nepali ? <Badge variant="outline">Nepali verifier</Badge> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>You can belong to several</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {teams.length ? (
              teams.map((t) => (
                <Badge key={t.id} variant="secondary">
                  {t.name}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">None</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>From your role</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-muted-foreground space-y-1 font-mono text-xs">
              {permissions.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
