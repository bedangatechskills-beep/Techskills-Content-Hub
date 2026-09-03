import { requireActiveUser } from "@/lib/auth/access.server";
import { BacklogView } from "@/components/people/backlog-view";

export const metadata = { title: "My backlog" };

export default async function MyBacklogPage() {
  const access = await requireActiveUser();
  return (
    <BacklogView profileId={access.profile.id} viewerId={access.profile.id} title="My backlog" />
  );
}
