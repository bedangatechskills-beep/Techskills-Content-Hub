import { requirePermission } from "@/lib/auth/access.server";
import { listProfileOptions } from "@/lib/admin/queries";
import { TeamForm } from "@/components/admin/team-form";

export const metadata = { title: "New team" };

export default async function NewTeamPage() {
  await requirePermission("admin.users");
  const people = await listProfileOptions();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">New team</h1>
        <p className="text-muted-foreground">Add members after the team is created.</p>
      </div>
      <TeamForm people={people} />
    </div>
  );
}
