"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setUserFlag, type UserFlag } from "@/lib/admin/actions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Props {
  profileId: string;
  isSelf: boolean;
  callerIsSuperAdmin: boolean;
  values: { final_approver: boolean; super_admin: boolean; can_verify_nepali: boolean };
}

const FLAGS: { key: UserFlag; label: string; help: string }[] = [
  {
    key: "final_approver",
    label: "Final Approver",
    help: "Independent of Admin. Required to insert a final approval. Admin status never grants it.",
  },
  {
    key: "super_admin",
    label: "Super Admin",
    help: "Everything Admin can do plus granting Admin and Super Admin. Only a super admin can change this.",
  },
  {
    key: "can_verify_nepali",
    label: "Can verify Nepali",
    help: "May clear Nepali-language flags raised by the creative gate. Nobody holds it until named (S8).",
  },
];

export function UserFlags({ profileId, isSelf, callerIsSuperAdmin, values }: Props) {
  const [pending, start] = useTransition();

  function toggle(flag: UserFlag, value: boolean) {
    start(async () => {
      const result = await setUserFlag(profileId, flag, value);
      if (result?.error) toast.error(result.error);
      else toast.success(result?.success ?? "Updated");
    });
  }

  return (
    <div className="space-y-4">
      {FLAGS.map((f) => {
        const locked =
          (isSelf && f.key !== "can_verify_nepali") ||
          (f.key === "super_admin" && !callerIsSuperAdmin);
        return (
          <div key={f.key} className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor={`flag-${f.key}`}>{f.label}</Label>
              <p className="text-muted-foreground text-xs">{f.help}</p>
              {locked && isSelf && f.key !== "can_verify_nepali" ? (
                <p className="text-muted-foreground text-xs">
                  You cannot change this on your own account.
                </p>
              ) : null}
            </div>
            <Switch
              id={`flag-${f.key}`}
              checked={values[f.key]}
              disabled={pending || locked}
              onCheckedChange={(v) => toggle(f.key, v)}
            />
          </div>
        );
      })}
    </div>
  );
}
