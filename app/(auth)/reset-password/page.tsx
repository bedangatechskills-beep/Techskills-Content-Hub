import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SetPasswordForm } from "@/components/forms/set-password-form";

export const metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          You are signed in through your reset link. Set a new password to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SetPasswordForm submitLabel="Save new password" />
      </CardContent>
    </Card>
  );
}
