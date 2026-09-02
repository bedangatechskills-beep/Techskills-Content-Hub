import { redirect } from "next/navigation";
import { getAccess } from "@/lib/auth/access.server";
import { signOut } from "@/lib/auth/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Account not active" };

const COPY: Record<string, { title: string; body: string }> = {
  invitation_pending: {
    title: "Finish your invitation",
    body: "Your profile exists but the invitation has not been completed. Use the link in your invitation e-mail, or ask an administrator to resend it.",
  },
  disabled: {
    title: "This account is disabled",
    body: "Your access has been switched off by an administrator. Your history in the hub is kept. Contact an administrator if this is unexpected.",
  },
  archived_demo: {
    title: "Demo account",
    body: "This is an archived demo profile and cannot use the live application.",
  },
};

export default async function AccountInactivePage() {
  const access = await getAccess();
  if (!access) redirect("/login");
  if (access.profile.account_status === "active") redirect("/");

  const copy = COPY[access.profile.account_status] ?? {
    title: "Account not active",
    body: "Your account cannot use the application right now. Contact an administrator.",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.body}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
