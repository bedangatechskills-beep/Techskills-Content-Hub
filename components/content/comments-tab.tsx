import type { CommentEntry, ReferenceData } from "@/lib/content/queries";
import { timeAgo } from "@/lib/workflow/statuses";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CommentForm, SECTION_LABEL } from "./comment-form";
import { CommentResolveButton } from "./comment-resolve-button";

export function CommentsTab({
  contentId,
  contentCode,
  comments,
  people,
  selfId,
}: {
  contentId: string;
  contentCode: string;
  comments: CommentEntry[];
  people: ReferenceData["people"];
  selfId: string;
}) {
  const nameById = new Map(people.map((p) => [p.id, p.full_name]));
  return (
    <div className="space-y-6">
      <ol className="space-y-3">
        {comments.length === 0 ? (
          <li className="text-muted-foreground rounded-md border p-6 text-center text-sm">
            No comments yet.
          </li>
        ) : null}
        {comments.map((c) => (
          <li
            key={c.id}
            className={cn("rounded-md border p-3", c.is_resolved && "bg-muted/40 opacity-80")}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{c.author_name ?? "Former staff member"}</span>
                <Badge variant="secondary">{SECTION_LABEL[c.section] ?? c.section}</Badge>
                <span
                  className="text-muted-foreground text-xs"
                  title={new Date(c.created_at).toLocaleString()}
                >
                  {timeAgo(c.created_at)}
                </span>
                {c.edited_at ? (
                  <span className="text-muted-foreground text-xs">(edited)</span>
                ) : null}
                {c.is_resolved ? <Badge variant="outline">Resolved</Badge> : null}
              </div>
              <CommentResolveButton
                commentId={c.id}
                contentCode={contentCode}
                resolved={c.is_resolved}
              />
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap">{c.body}</p>
            {c.mentions.length ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Mentioned: {c.mentions.map((m) => nameById.get(m) ?? "someone").join(", ")}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      <CommentForm
        contentId={contentId}
        contentCode={contentCode}
        people={people}
        selfId={selfId}
      />
    </div>
  );
}
