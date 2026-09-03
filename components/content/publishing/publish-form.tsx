"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone, ShieldAlert } from "lucide-react";
import { publishContent, type LinkInput } from "@/lib/publishing/actions";
import type { ScheduleWithNames } from "@/lib/publishing/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Publisher marks published, stores live URLs, confirms the AI disclosure when required (§54). */
export function PublishForm({
  contentId,
  code,
  requiresDisclosure,
  schedules,
  platforms,
}: {
  contentId: string;
  code: string;
  requiresDisclosure: boolean;
  schedules: ScheduleWithNames[];
  platforms: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const targets = schedules.length
    ? schedules.map((s) => ({ id: s.platform_id, name: s.platform_name }))
    : platforms;
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const blocked = requiresDisclosure && !confirmed;
  const anyUrl = Object.values(urls).some((u) => u.trim().length > 0);

  function submit() {
    const links: LinkInput[] = Object.entries(urls)
      .filter(([, u]) => u.trim())
      .map(([platform_id, url]) => ({ platform_id, url: url.trim() }));
    start(async () => {
      const r = await publishContent(contentId, code, links, confirmed, note || undefined);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(r?.success ?? "Published");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-4" aria-hidden /> Mark published
        </CardTitle>
        <CardDescription>
          Paste the live URL for each platform after posting. Publishing here never posts to a
          platform; it records what you did.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requiresDisclosure ? (
          <Alert className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <ShieldAlert className="size-4" aria-hidden />
            <AlertTitle>AI disclosure required</AlertTitle>
            <AlertDescription>
              This creative contains AI imagery. Set the platform&apos;s AI-content toggle when you
              post, then confirm below. Publishing is blocked until you do.
            </AlertDescription>
          </Alert>
        ) : null}
        {targets.map((p) => (
          <div key={p.id} className="space-y-1">
            <Label htmlFor={`url-${p.id}`}>{p.name} URL</Label>
            <Input
              id={`url-${p.id}`}
              type="url"
              inputMode="url"
              placeholder="https://"
              value={urls[p.id] ?? ""}
              onChange={(e) => setUrls((u) => ({ ...u, [p.id]: e.target.value }))}
            />
          </div>
        ))}
        {requiresDisclosure ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              aria-label="I confirm the platform AI-content disclosure toggle was set"
            />
            <span>
              I confirm the platform AI-content disclosure toggle was set for this post (logged with
              my name and the time).
            </span>
          </label>
        ) : null}
        <div className="space-y-1">
          <Label htmlFor="publish-note">Note (optional)</Label>
          <Textarea
            id="publish-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <Button type="button" onClick={submit} disabled={pending || blocked || !anyUrl}>
          {pending ? "Publishing…" : "Mark published"}
        </Button>
        {blocked ? (
          <p className="text-muted-foreground text-xs">
            Blocked: tick the AI disclosure confirmation first.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
