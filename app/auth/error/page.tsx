import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Link problem" };

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return (
    <main className="bg-muted/40 flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>That link did not work</CardTitle>
          <CardDescription>{message ?? "The link is invalid or has expired."}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button variant="outline" render={<Link href="/forgot-password" />}>
            Request a new password link
          </Button>
          <Button variant="ghost" render={<Link href="/login" />}>
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
