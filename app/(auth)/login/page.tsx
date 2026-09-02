import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Staff accounts only. Your role and teams load automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm next={next} />
        <p className="text-center text-sm">
          <Link
            href="/forgot-password"
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
