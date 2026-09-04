import { FileImage, Film } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small preview of a creative (private bucket, signed URL). Images render
 * directly; videos show the first frame; anything else a placeholder icon.
 */
export function CreativeThumb({
  url,
  mime,
  kind,
  alt = "",
  className,
  size = "sm",
}: {
  url: string | null | undefined;
  mime?: string | null;
  kind?: string | null;
  alt?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "lg" ? "w-full max-h-[480px] aspect-[4/5]" : size === "md" ? "size-20" : "size-11";
  const base = cn(
    "bg-muted text-muted-foreground relative shrink-0 overflow-hidden rounded-md border",
    box,
    className,
  );
  const isVideo = mime?.startsWith("video/") || kind === "video";
  if (
    url &&
    !isVideo &&
    (mime?.startsWith("image/") || kind === "image" || kind === "thumbnail" || kind === "carousel")
  ) {
    return (
      <div className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, no optimiser */}
        <img
          src={url}
          alt={alt}
          className={cn("h-full w-full", size === "lg" ? "object-contain" : "object-cover")}
          loading="lazy"
        />
      </div>
    );
  }
  if (url && isVideo) {
    return (
      <div className={base}>
        <video
          src={url}
          className={cn("h-full w-full", size === "lg" ? "object-contain" : "object-cover")}
          preload="metadata"
          muted
          controls={size === "lg"}
        />
        <Film className="absolute right-1 bottom-1 size-3.5 text-white drop-shadow" aria-hidden />
      </div>
    );
  }
  return (
    <div className={cn(base, "flex items-center justify-center")} aria-label="No creative yet">
      {isVideo ? (
        <Film className="size-4" aria-hidden />
      ) : (
        <FileImage className="size-4" aria-hidden />
      )}
    </div>
  );
}
