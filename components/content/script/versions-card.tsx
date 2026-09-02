"use client";

import { useMemo, useState } from "react";
import { GitCompare } from "lucide-react";
import type { ScriptVersionEntry } from "@/lib/script/queries";
import { diffStats, wordDiff } from "@/lib/script/diff";
import { timeAgo, formatDateTime } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  submitted: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
  approved: "bg-emerald-600 text-white",
  superseded: "bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100",
  changes_requested: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
};

export function VersionsCard({
  versions,
  currentId,
  approvedId,
}: {
  versions: ScriptVersionEntry[];
  currentId: string | null;
  approvedId: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const approvedNo = versions.find((v) => v.id === approvedId)?.version_no ?? null;

  const open = versions.find((v) => v.id === openId) ?? null;
  const previous = open
    ? (versions.find((v) => v.version_no === open.version_no - 1) ?? null)
    : null;
  const ops = useMemo(
    () => (open && previous && compare ? wordDiff(previous.body, open.body) : null),
    [open, previous, compare],
  );
  const stats = ops ? diffStats(ops) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Versions ({versions.length})</CardTitle>
        <CardDescription>
          Append-only history. Click a version to read it or compare with the one before.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No versions yet.</p>
        ) : (
          <ul className="divide-y">
            {versions.map((v) => {
              const newerThanApproved = approvedNo !== null && v.version_no > approvedNo;
              return (
                <li key={v.id} className="py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(v.id);
                      setCompare(false);
                    }}
                    className="hover:bg-muted/60 w-full rounded px-2 py-1 text-left text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-medium">V{v.version_no}</span>
                      <Badge className={STATUS_CLASS[v.approval_status] ?? ""}>
                        {v.approval_status.replace("_", " ")}
                      </Badge>
                      {v.id === currentId ? <Badge variant="outline">current</Badge> : null}
                      {v.id === approvedId ? <Badge variant="outline">approved</Badge> : null}
                      {newerThanApproved ? (
                        <Badge
                          variant="outline"
                          className={
                            v.is_material_change === null
                              ? "border-amber-500/50 text-amber-700 dark:text-amber-400"
                              : ""
                          }
                        >
                          {v.is_material_change === null
                            ? "unclassified"
                            : v.is_material_change
                              ? "material"
                              : "non-material"}
                        </Badge>
                      ) : null}
                      {v.latest_evaluation?.overall_score != null ? (
                        <span className="text-muted-foreground text-xs">
                          AI {v.latest_evaluation.overall_score}/10
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {v.author_name ?? "—"} · {timeAgo(v.created_at)}
                      {v.change_summary ? ` · ${v.change_summary}` : ""}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {open ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  V{open.version_no} · {open.approval_status.replace("_", " ")}
                </DialogTitle>
                <DialogDescription>
                  {open.author_name ?? "—"} · {formatDateTime(open.created_at)}
                  {open.change_summary ? ` · ${open.change_summary}` : ""}
                  {open.material_reason
                    ? ` · ${open.is_material_change ? "Material" : "Non-material"}: ${open.material_reason}`
                    : ""}
                </DialogDescription>
              </DialogHeader>
              {previous ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    variant={compare ? "default" : "outline"}
                    onClick={() => setCompare((c) => !c)}
                  >
                    <GitCompare className="size-4" aria-hidden />{" "}
                    {compare ? "Hide diff" : `Compare with V${previous.version_no}`}
                  </Button>
                  {stats ? (
                    <span className="text-muted-foreground text-xs">
                      <span className="text-emerald-700 dark:text-emerald-400">
                        +{stats.inserted}
                      </span>{" "}
                      · <span className="text-red-700 dark:text-red-400">−{stats.deleted}</span>{" "}
                      words
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="rounded-md border p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {ops
                  ? ops.map((o, i) => (
                      <span
                        key={i}
                        className={cn(
                          o.type === "insert" &&
                            "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
                          o.type === "delete" &&
                            "bg-red-100 text-red-900 line-through dark:bg-red-900/40 dark:text-red-200",
                        )}
                      >
                        {o.text}
                      </span>
                    ))
                  : open.body}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
