import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * TechSkills mark from public/brand/techskills-logo.jpg (the official shield
 * wordmark, supplied 2026-09-04). The file is a JPG on white, so it sits in a
 * white tile on dark surfaces and bare on light ones.
 */
export function BrandLogo({
  variant = "light",
  className,
  withHub = true,
  size = 40,
}: {
  /** "light" = for dark backgrounds (sidebar); "dark" = for white backgrounds */
  variant?: "light" | "dark";
  className?: string;
  withHub?: boolean;
  size?: number;
}) {
  const tech = variant === "light" ? "#ffffff" : "#102844";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white",
          variant === "light" && "ring-1 ring-white/20",
        )}
        style={{ width: size, height: size }}
      >
        <Image
          src="/brand/techskills-logo.jpg"
          alt="TechSkills"
          width={size}
          height={size}
          priority
          className="object-contain"
        />
      </span>
      <span className="leading-none">
        <span className="block text-[15px] font-bold tracking-tight" style={{ color: tech }}>
          Tech<span style={{ color: "#f05921" }}>Skills</span>
        </span>
        {withHub ? (
          <span
            className="mt-0.5 block text-[10px] font-medium tracking-[0.18em] uppercase"
            style={{ color: variant === "light" ? "rgba(255,255,255,0.7)" : "#50647b" }}
          >
            Content Hub
          </span>
        ) : null}
      </span>
    </span>
  );
}
