import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SetPasswordForm } from "@/components/forms/set-password-form";

export const metadata = { title: "Welcome" };

// First-time password setup after accepting an invitation. Supabase manages
// the one-time token; by the time this page renders the session exists.
export default async function InvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? "there";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome, {name}</CardTitle>
        <CardDescription>
          Your account is ready. Choose a password to finish setting it up. Your role and teams have
          already been assigned by an administrator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SetPasswordForm submitLabel="Set password and continue" />
      </CardContent>
    </Card>
  );
}
