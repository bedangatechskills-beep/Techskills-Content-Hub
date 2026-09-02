"use client";

import { useActionState } from "react";
import { setPassword } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

export function SetPasswordForm({ submitLabel }: { submitLabel: string }) {
  const [state, action] = useActionState(setPassword, null);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          autoFocus
        />
        <p className="text-muted-foreground text-xs">At least 10 characters.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Saving…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
