import { cn } from "@/lib/utils";

/**
 * TechSkills wordmark. Uses public/brand/techskills-logo.png when present
 * (drop the official file there); otherwise an SVG wordmark in brand colours.
 */
export function BrandLogo({
  variant = "light",
  className,
  withHub = true,
}: {
  /** "light" = for dark backgrounds (sidebar); "dark" = for white backgrounds */
  variant?: "light" | "dark";
  className?: string;
  withHub?: boolean;
}) {
  const tech = variant === "light" ? "#ffffff" : "#102844";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 44 44" width="34" height="34" aria-hidden className="shrink-0">
        <rect x="2" y="2" width="40" height="40" rx="10" fill="#005ea1" />
        <path d="M12 15h20v5h-7.5v13h-5V20H12z" fill="#ffffff" />
        <rect x="27" y="27" width="9" height="9" rx="2" fill="#f05921" />
      </svg>
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
