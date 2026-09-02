import Link from "next/link";
import { requirePermission } from "@/lib/auth/access.server";
import { getReferenceOptions, listReferenceRows } from "@/lib/reference/queries";
import {
  isReferenceTableKey,
  REFERENCE_TABLE_ORDER,
  REFERENCE_TABLES,
} from "@/lib/reference/tables";
import { ReferenceTable } from "@/components/admin/reference/reference-table";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reference data" };

export default async function ReferencePage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  await requirePermission("admin.reference_data");
  const { table } = await searchParams;
  const key = isReferenceTableKey(table) ? table : "programs";
  const config = REFERENCE_TABLES[key];
  const [rows, options] = await Promise.all([listReferenceRows(key), getReferenceOptions()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reference data</h1>
        <p className="text-muted-foreground">
          The canonical lists every gate checks against. Managed here, never typed free-form on a
          record.
        </p>
      </div>

      <nav aria-label="Reference tables" className="flex flex-wrap gap-1 border-b">
        {REFERENCE_TABLE_ORDER.map((k) => (
          <Link
            key={k}
            href={`/admin/reference?table=${k}`}
            aria-current={k === key ? "page" : undefined}
            className={cn(
              "-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm",
              k === key
                ? "border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {REFERENCE_TABLES[k].label}
          </Link>
        ))}
      </nav>

      <ReferenceTable key={key} config={config} rows={rows} options={options} />
    </div>
  );
}
