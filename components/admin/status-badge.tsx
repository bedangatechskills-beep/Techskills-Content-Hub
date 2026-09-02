import { Badge } from "@/components/ui/badge";
import type { AccountStatus } from "@/lib/supabase/database.types";

const LABEL: Record<
  AccountStatus,
  { text: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  active: { text: "Active", variant: "default" },
  invitation_pending: { text: "Invitation pending", variant: "secondary" },
  disabled: { text: "Disabled", variant: "destructive" },
  archived_demo: { text: "Archived demo", variant: "outline" },
};

export function StatusBadge({ status }: { status: AccountStatus }) {
  const l = LABEL[status];
  return <Badge variant={l.variant}>{l.text}</Badge>;
}
