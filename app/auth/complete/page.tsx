import { Suspense } from "react";
import { CompleteSignIn } from "./complete-sign-in";

export const metadata = { title: "Signing you in" };

export default function AuthCompletePage() {
  return (
    <main className="bg-muted/40 flex min-h-screen items-center justify-center p-6">
      <Suspense fallback={null}>
        <CompleteSignIn />
      </Suspense>
    </main>
  );
}
