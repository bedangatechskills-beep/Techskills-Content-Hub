import { requireActiveUser } from "@/lib/auth/access.server";
import { getReferenceData, listKanbanCards, type ContentFilters } from "@/lib/content/queries";
import { KanbanBoard } from "@/components/board/kanban-board";
import { BoardFilters } from "@/components/board/board-filters";

export const metadata = { title: "Board" };

type Search = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
}

export default async function BoardPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireActiveUser();
  const sp = await searchParams;
  const filters: ContentFilters = {
    region: one(sp.region),
    program: one(sp.program),
    campaign: one(sp.campaign),
    owner: one(sp.owner),
    priority: one(sp.priority),
    q: one(sp.q),
    includeArchived: false,
  };
  const [cards, refData] = await Promise.all([listKanbanCards(filters), getReferenceData()]);

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Board</h1>
          <p className="text-muted-foreground text-sm">
            Drag a card to move it. The database decides whether the move is allowed and asks for a
            reason on backward moves.
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          {cards.length} item{cards.length === 1 ? "" : "s"} shown
        </p>
      </div>

      <BoardFilters
        refData={refData}
        values={{
          region: filters.region ?? "",
          program: filters.program ?? "",
          campaign: filters.campaign ?? "",
          owner: filters.owner ?? "",
          priority: filters.priority ?? "",
          q: filters.q ?? "",
        }}
      />

      <KanbanBoard statuses={refData.statuses} cards={cards} />
    </div>
  );
}
