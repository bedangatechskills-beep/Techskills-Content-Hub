"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ExternalLink, FolderOpen } from "lucide-react";
import { updateContent } from "@/lib/content/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FolderCard({
  contentId,
  code,
  url,
  canEdit,
}: {
  contentId: string;
  code: string;
  url: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(url ?? "");
  const [error, setError] = useState<string | null>(null);

  function save() {
    const v = value.trim();
    if (v && !/^https:\/\/\S+$/i.test(v)) {
      setError("Enter a full https:// link to the SharePoint or Drive folder.");
      return;
    }
    setError(null);
    start(async () => {
      const r = await updateContent(contentId, code, { production_folder_url: v || null });
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Folder link saved");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="size-4" aria-hidden /> Production folder
        </CardTitle>
        <CardDescription>
          Files live in the company library; the hub stores the link (§34–35).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!url ? (
          <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Missing folder link — required before production review and final approval.
          </p>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-primary inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3.5" aria-hidden /> Open folder
          </a>
        )}
        {canEdit ? (
          <div className="space-y-2">
            <Label htmlFor="folder-url">Folder URL</Label>
            <Input
              id="folder-url"
              type="url"
              placeholder="https://…sharepoint.com/…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={pending}
            />
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
            <Button size="sm" onClick={save} disabled={pending || value.trim() === (url ?? "")}>
              {pending ? "Saving…" : "Save link"}
            </Button>
          </div>
        ) : url ? (
          <p className="text-muted-foreground truncate text-xs">{url}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
