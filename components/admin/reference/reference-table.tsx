"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { toggleReferenceActive } from "@/lib/reference/actions";
import type { ReferenceOptions, ReferenceRow } from "@/lib/reference/queries";
import type { FieldConfig, TableConfig } from "@/lib/reference/tables";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReferenceForm } from "./reference-form";

interface Props {
  config: TableConfig;
  rows: ReferenceRow[];
  options: ReferenceOptions;
}

function display(f: FieldConfig, row: ReferenceRow, options: ReferenceOptions): string {
  const v = row[f.name];
  if (v == null || v === "") return "—";
  if (f.type === "boolean") return v ? "Yes" : "No";
  if (f.type === "json") {
    const s = JSON.stringify(v);
    return s.length > 60 ? s.slice(0, 57) + "…" : s;
  }
  if (f.type === "select") {
    const opts = f.optionSource ? options[f.optionSource] : (f.options ?? []);
    return opts.find((o) => o.value === String(v))?.label ?? String(v);
  }
  if (f.type === "date") return String(v).slice(0, 10);
  return String(v);
}

export function ReferenceTable({ config, rows, options }: Props) {
  const [editing, setEditing] = useState<ReferenceRow | null | "new">(null);
  const [pending, start] = useTransition();
  const listed = config.fields.filter((f) => f.listed);

  function toggle(row: ReferenceRow, value: boolean) {
    start(async () => {
      const result = await toggleReferenceActive(config.key, String(row.id), value);
      if (result?.error) toast.error(result.error);
      else toast.success(result?.success ?? "Updated");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{config.label}</h2>
          <p className="text-muted-foreground text-sm">{config.description}</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Add
        </Button>
      </div>

      {config.banner ? (
        <Alert>
          <AlertDescription>{config.banner}</AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {listed.map((f) => (
                <TableHead key={f.name}>{f.label}</TableHead>
              ))}
              {config.softDelete ? <TableHead>Status</TableHead> : null}
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const id = String(row[config.idColumn]);
              const active = row.is_active !== false;
              return (
                <TableRow
                  key={id}
                  className={config.softDelete && !active ? "opacity-70" : undefined}
                >
                  {listed.map((f) => (
                    <TableCell
                      key={f.name}
                      className={f.type === "json" ? "font-mono text-xs" : undefined}
                    >
                      {display(f, row, options)}
                    </TableCell>
                  ))}
                  {config.softDelete ? (
                    <TableCell>
                      {active ? (
                        <Badge>Active</Badge>
                      ) : config.key === "reference_handles" ? (
                        <Badge variant="destructive">Retired — defect if seen</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(row)}
                        aria-label={`Edit ${id}`}
                      >
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      {config.softDelete ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => toggle(row, !active)}
                        >
                          {active ? "Deactivate" : "Reactivate"}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={listed.length + 2}
                  className="text-muted-foreground text-center"
                >
                  Nothing here yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing === "new"
                ? `Add to ${config.label}`
                : `Edit ${config.label.replace(/s$/, "").toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>
              {config.softDelete
                ? "Rows are never deleted; deactivate instead."
                : "Changes take effect on the next AI evaluation."}
            </DialogDescription>
          </DialogHeader>
          {editing !== null ? (
            <ReferenceForm
              key={editing === "new" ? "new" : String(editing[config.idColumn])}
              config={config}
              options={options}
              row={editing === "new" ? undefined : editing}
              onSaved={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
