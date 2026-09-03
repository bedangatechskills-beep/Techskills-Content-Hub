"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createCreativeUpload, registerCreativeVersion } from "@/lib/production/actions";
import type { CreativeEntry } from "@/lib/production/queries";
import type { CreativeKind } from "@/lib/supabase/database.types";
import { timeAgo } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";
const KINDS: CreativeKind[] = ["image", "video", "carousel", "thumbnail", "other"];

function kindFromMime(mime: string): CreativeKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "other";
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function imageDims(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function videoMeta(file: File): Promise<{ width?: number; height?: number; duration?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      resolve({
        width: v.videoWidth,
        height: v.videoHeight,
        duration: Math.round(v.duration * 100) / 100,
      });
      URL.revokeObjectURL(url);
    };
    v.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    v.src = url;
  });
}

export function CreativesCard({
  contentId,
  code,
  creatives,
  currentId,
  canUpload,
}: {
  contentId: string;
  code: string;
  creatives: CreativeEntry[];
  currentId: string | null;
  canUpload: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<string | null>(null);
  const [kind, setKind] = useState<CreativeKind>("image");
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function onFileChange() {
    const f = fileRef.current?.files?.[0];
    if (f) setKind(kindFromMime(f.type));
  }

  function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file first");
      return;
    }
    start(async () => {
      try {
        setStep("Preparing upload…");
        const prep = await createCreativeUpload(contentId, file.name, file.type);
        if (prep.error || !prep.path || !prep.token)
          throw new Error(prep.error ?? "Could not prepare upload");

        setStep("Uploading…");
        const supabase = createClient();
        const { error: upErr } = await supabase.storage
          .from("creatives")
          .uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type });
        if (upErr) throw new Error(upErr.message);

        setStep("Reading file details…");
        const meta = file.type.startsWith("image/")
          ? await imageDims(file)
          : file.type.startsWith("video/")
            ? await videoMeta(file)
            : {};

        setStep("Registering version…");
        const reg = await registerCreativeVersion({
          contentId,
          code,
          path: prep.path,
          fileName: file.name,
          mime: file.type,
          size: file.size,
          kind,
          ...meta,
          note: note.trim() || undefined,
        });
        if (reg?.error) throw new Error(reg.error);
        toast.success(reg?.success ?? "Uploaded");
        if (fileRef.current) fileRef.current.value = "";
        setNote("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setStep(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creative versions</CardTitle>
        <CardDescription>
          Review versions uploaded here; the master files stay in the production folder. Every
          upload is a new version.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {canUpload ? (
          <div className="space-y-3 rounded-md border p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <div className="space-y-1">
                <Label htmlFor="creative-file">File</Label>
                <Input
                  id="creative-file"
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*,application/pdf"
                  onChange={onFileChange}
                  disabled={pending}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="creative-kind">Kind</Label>
                <select
                  id="creative-kind"
                  className={selectClass}
                  value={kind}
                  onChange={(e) => setKind(e.target.value as CreativeKind)}
                  disabled={pending}
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="creative-note">Note</Label>
              <Input
                id="creative-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What changed in this version"
                disabled={pending}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={upload} disabled={pending}>
                <Upload className="size-4" aria-hidden />{" "}
                {pending ? (step ?? "Working…") : "Upload review version"}
              </Button>
              <p className="text-muted-foreground text-xs">Images, video or PDF, up to 500 MB.</p>
            </div>
          </div>
        ) : null}

        {creatives.length === 0 ? (
          <p className="text-muted-foreground text-sm">No review versions uploaded yet.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {creatives.map((c) => {
              const isCurrent = c.id === currentId;
              return (
                <li key={c.id} className="overflow-hidden rounded-md border">
                  <div className="bg-muted flex aspect-video items-center justify-center overflow-hidden">
                    {c.signed_url && c.mime?.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.signed_url}
                        alt={`Creative V${c.version_no}`}
                        className="h-full w-full object-contain"
                      />
                    ) : c.signed_url && c.mime?.startsWith("video/") ? (
                      <video
                        controls
                        src={c.signed_url}
                        className="h-full w-full"
                        preload="metadata"
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {c.mime ?? "file"} · no preview
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">
                        V{c.version_no}{" "}
                        <span className="text-muted-foreground text-xs">· {c.kind}</span>
                      </p>
                      {isCurrent ? <Badge>Current</Badge> : null}
                    </div>
                    <p className="text-muted-foreground truncate text-xs" title={c.file_name}>
                      {c.file_name}
                      {c.size_bytes != null ? ` · ${formatSize(c.size_bytes)}` : ""}
                      {c.width && c.height ? ` · ${c.width}×${c.height}` : ""}
                      {c.duration_s != null ? ` · ${c.duration_s}s` : ""}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {c.uploader_name ?? "Unknown"} · {timeAgo(c.created_at)}
                    </p>
                    {c.note ? <p className="text-xs italic">“{c.note}”</p> : null}
                    {c.signed_url ? (
                      <a
                        href={c.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                      >
                        <Download className="size-3" aria-hidden /> Download
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
