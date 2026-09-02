import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Not allowed" };

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <ShieldX className="text-muted-foreground size-10" aria-hidden />
      <h1 className="text-2xl font-semibold">Not allowed</h1>
      <p className="text-muted-foreground">
        Your role does not include permission for this page. Permissions are assigned by an
        administrator and enforced in the database, not just in the menu.
      </p>
      <Button variant="outline" render={<Link href="/" />}>
        Back to dashboard
      </Button>
    </div>
  );
}
