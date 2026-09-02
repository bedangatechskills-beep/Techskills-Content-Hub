import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth/access.server";
import { can } from "@/lib/permissions/access";
import { getReferenceData } from "@/lib/content/queries";
import { CreateContentForm } from "@/components/content/create-form";

export const metadata = { title: "New request" };

export default async function NewContentPage() {
  const access = await requireActiveUser();
  if (!can(access, "content.create")) redirect("/403");
  const refData = await getReferenceData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New content request</h1>
        <p className="text-muted-foreground">
          Creates the master Content Record with a permanent ID. It starts in Requested / Planned.
        </p>
      </div>
      <CreateContentForm refData={refData} />
    </div>
  );
}
