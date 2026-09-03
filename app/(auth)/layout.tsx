import { BrandLogo } from "@/components/shell/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="bg-brand-navy relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full opacity-30 blur-3xl"
          style={{ background: "#005ea1" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full opacity-25 blur-3xl"
          style={{ background: "#f05921" }}
          aria-hidden
        />
        <BrandLogo variant="light" />
        <div className="relative max-w-md space-y-4">
          <p className="text-brand-orange text-xs font-semibold tracking-[0.2em] uppercase">
            Internal · Marketing
          </p>
          <h1 className="text-4xl leading-tight font-bold text-white">
            Every post checked <span className="text-brand-orange">before</span> it reaches the CEO.
          </h1>
          <p className="text-white/70">
            One record per piece of content, sixteen stages, two AI quality gates, and human
            approvals that pin exact versions. No typos, no wrong handles, no surprises.
          </p>
        </div>
        <p className="relative text-xs text-white/50">
          Learn Locally. Build a Global Career. · Perth · Melbourne · North Strathfield · Rockdale ·
          Kathmandu
        </p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <BrandLogo variant="dark" />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
