export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-muted/40 flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            TechSkills
          </p>
          <h1 className="text-xl font-semibold">Content Hub</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
