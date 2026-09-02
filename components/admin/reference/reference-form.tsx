"use client";

import { useActionState, useEffect } from "react";
import { saveReferenceRow } from "@/lib/reference/actions";
import type { ReferenceOptions, ReferenceRow } from "@/lib/reference/queries";
import type { FieldConfig, TableConfig } from "@/lib/reference/tables";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

interface Props {
  config: TableConfig;
  options: ReferenceOptions;
  row?: ReferenceRow;
  onSaved?: () => void;
}

const selectClass =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

function defaultFor(f: FieldConfig, row?: ReferenceRow): string {
  const v = row?.[f.name];
  if (v == null) return "";
  if (f.type === "json") return JSON.stringify(v, null, 2);
  if (f.type === "date") return String(v).slice(0, 10);
  return String(v);
}

export function ReferenceForm({ config, options, row, onSaved }: Props) {
  const [state, action] = useActionState(saveReferenceRow, null);
  const existingId = row ? String(row[config.idColumn] ?? "") : "";

  useEffect(() => {
    if (state?.success && onSaved) onSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="table" value={config.key} />
      {existingId ? <input type="hidden" name="_existing_id" value={existingId} /> : null}

      {config.fields.map((f) => {
        const id = `${config.key}-${f.name}`;
        const locked = !!existingId && !!f.immutableOnEdit;
        const opts = f.optionSource ? options[f.optionSource] : (f.options ?? []);

        if (f.type === "boolean") {
          return (
            <label key={f.name} className="flex items-center gap-2 text-sm">
              <Checkbox name={f.name} defaultChecked={row?.[f.name] === true} />
              {f.label}
            </label>
          );
        }

        return (
          <div key={f.name} className="space-y-1.5">
            <Label htmlFor={id}>
              {f.label}
              {f.required ? <span className="text-destructive"> *</span> : null}
            </Label>
            {f.type === "select" ? (
              <select
                id={id}
                name={f.name}
                defaultValue={defaultFor(f, row)}
                required={f.required}
                disabled={locked}
                className={selectClass}
              >
                <option value="">{f.required ? "Choose…" : "None"}</option>
                {opts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <Textarea id={id} name={f.name} defaultValue={defaultFor(f, row)} rows={3} />
            ) : f.type === "json" ? (
              <Textarea
                id={id}
                name={f.name}
                defaultValue={defaultFor(f, row) || (row ? "" : "{}")}
                rows={8}
                className="font-mono text-xs"
                spellCheck={false}
                required={f.required}
              />
            ) : (
              <Input
                id={id}
                name={f.name}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                defaultValue={defaultFor(f, row)}
                required={f.required}
                readOnly={locked}
                pattern={f.pattern && !locked ? f.pattern.source : undefined}
                title={f.patternHint}
              />
            )}
            {f.help ? <p className="text-muted-foreground text-xs">{f.help}</p> : null}
          </div>
        );
      })}

      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">{existingId ? "Save changes" : "Add"}</SubmitButton>
    </form>
  );
}
