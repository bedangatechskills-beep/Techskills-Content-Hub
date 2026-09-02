"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { userLifecycle, type LifecycleAction } from "@/lib/admin/actions";
import type { AccountStatus } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  profileId: string;
  status: AccountStatus;
  isSelf: boolean;
}

export function UserLifecycle({ profileId, status, isSelf }: Props) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<LifecycleAction | null>(null);

  function run(action: LifecycleAction) {
    start(async () => {
      const result = await userLifecycle(profileId, action);
      setConfirm(null);
      if (result?.error) toast.error(result.error);
      else toast.success(result?.success ?? "Done");
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "invitation_pending" ? (
        <Button variant="outline" disabled={pending} onClick={() => run("resend_invite")}>
          Resend invitation
        </Button>
      ) : null}
      {status === "active" ? (
        <Button variant="outline" disabled={pending} onClick={() => run("send_reset")}>
          Send password reset
        </Button>
      ) : null}
      {status === "active" || status === "invitation_pending" ? (
        <Button
          variant="destructive"
          disabled={pending || isSelf}
          onClick={() => setConfirm("disable")}
        >
          Disable user
        </Button>
      ) : null}
      {status === "disabled" ? (
        <Button disabled={pending} onClick={() => run("reactivate")}>
          Reactivate user
        </Button>
      ) : null}

      <Dialog open={confirm === "disable"} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable this user?</DialogTitle>
            <DialogDescription>
              They will be signed out and unable to log in. The profile and every reference to it
              (scripts, comments, approvals, audit rows) stays intact. You can reactivate later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => run("disable")} disabled={pending}>
              Disable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
