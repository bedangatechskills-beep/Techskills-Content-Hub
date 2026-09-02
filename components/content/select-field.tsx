import { Label } from "@/components/ui/label";

export const selectClass =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs disabled:opacity-60";

export interface Option {
  value: string;
  label: string;
}

export function SelectField({
  id,
  name,
  label,
  options,
  defaultValue,
  placeholder = "—",
  required,
  disabled,
  help,
}: {
  id: string;
  name: string;
  label: string;
  options: Option[];
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  help?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        disabled={disabled}
        className={selectClass}
      >
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help ? <p className="text-muted-foreground text-xs">{help}</p> : null}
    </div>
  );
}
