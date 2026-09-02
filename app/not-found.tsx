import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground max-w-sm">
        The page you asked for does not exist or has moved.
      </p>
      <Button variant="outline" render={<Link href="/" />}>
        Back to dashboard
      </Button>
    </main>
  );
}
