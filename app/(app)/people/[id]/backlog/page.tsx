import { requireActiveUser } from "@/lib/auth/access.server";
import { BacklogView } from "@/components/people/backlog-view";

export const metadata = { title: "Backlog" };

export default async function PersonBacklogPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  const { id } = await params;
  return <BacklogView profileId={id} viewerId={access.profile.id} />;
}
