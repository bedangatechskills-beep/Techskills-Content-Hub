"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ReasonDialog({
  open,
  title,
  description,
  pending,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const valid = reason.trim().length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setReason("");
          onCancel();
        }
      }}
    >
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            const r = reason.trim();
            setReason("");
            onSubmit(r);
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="move-reason">Reason</Label>
            <Textarea
              id="move-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              autoFocus
              placeholder="What needs to change, and why?"
            />
            <p className="text-muted-foreground text-xs">Stored permanently in the Activity log.</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setReason("");
                onCancel();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || pending}>
              {pending ? "Moving…" : "Move with reason"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
