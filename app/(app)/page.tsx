import { requireActiveUser } from "@/lib/auth/access.server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const access = await requireActiveUser();
  const { profile, role, teams, permissions } = access;

  return (
    <div className="space-y-6">
      <div className="bg-brand-navy relative overflow-hidden rounded-xl p-6 text-white md:p-8">
        <div
          className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full opacity-40 blur-3xl"
          style={{ background: "#005ea1" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full opacity-30 blur-3xl"
          style={{ background: "#f05921" }}
          aria-hidden
        />
        <p className="text-brand-orange relative text-xs font-semibold tracking-[0.2em] uppercase">
          TechSkills Content Hub
        </p>
        <h1 className="relative mt-1 text-3xl font-bold text-white">
          Hello, {profile.full_name.split(" ")[0]}
        </h1>
        <p className="relative mt-2 max-w-xl text-white/75">
          Role dashboards arrive in Phase 6. Until then, the Board and Content pages are the working
          views. Below is what the system loaded for you at sign-in.
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
