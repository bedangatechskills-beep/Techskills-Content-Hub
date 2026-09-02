import { requirePermission } from "@/lib/auth/access.server";
import { listRoles, listTeams } from "@/lib/admin/queries";
import { UserForm } from "@/components/admin/user-form";

export const metadata = { title: "Invite user" };

export default async function NewUserPage() {
  await requirePermission("admin.users");
  const [roles, teams] = await Promise.all([listRoles(), listTeams()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Invite a user</h1>
        <p className="text-muted-foreground">
          Creates the staff profile and e-mails a one-time link. The person sets their own password
          on first sign-in. Final Approver and Super Admin are toggled afterwards on the profile
          page.
        </p>
      </div>
      <UserForm roles={roles} teams={teams} />
    </div>
  );
}
