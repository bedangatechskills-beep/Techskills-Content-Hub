// Config for the generic reference-data editor. One entry per admin-editable
// table; the form and list components render from this. Rows are never
// deleted, only deactivated (is_active) — matching the "disable, never delete"
// rule for everything in the hub.

export type ReferenceTableKey =
  | "programs"
  | "campaigns"
  | "campuses"
  | "platforms"
  | "objectives"
  | "content_pillars"
  | "differentiators"
  | "content_types"
  | "reference_handles"
  | "brand_facts";

export type FieldType = "text" | "textarea" | "boolean" | "number" | "select" | "date" | "json";
export type OptionSource = "regions" | "programs" | "platforms" | "profiles";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Static options, or a source resolved server-side. */
  options?: { value: string; label: string }[];
  optionSource?: OptionSource;
  /** Regex the value must match (text fields). */
  pattern?: RegExp;
  patternHint?: string;
  /** Column shown in the list table. */
  listed?: boolean;
  /** Cannot be changed after the row exists. */
  immutableOnEdit?: boolean;
  help?: string;
}

export interface TableConfig {
  key: ReferenceTableKey;
  label: string;
  description: string;
  /** Primary key column. */
  idColumn: "id" | "key";
  /** Whether rows carry is_active for soft delete. */
  softDelete: boolean;
  /** Column to sort the list by. */
  orderBy: string;
  fields: FieldConfig[];
  /** Extra note shown above the list. */
  banner?: string;
}

const KEY_PATTERN = /^[a-z_]+$/;
const KEY_HINT = "Lower-case letters and underscores only.";

const keyField: FieldConfig = {
  name: "key",
  label: "Key",
  type: "text",
  required: true,
  pattern: KEY_PATTERN,
  patternHint: KEY_HINT,
  listed: true,
  immutableOnEdit: true,
  help: "Stable identifier used in code and prompts. Cannot change later.",
};
const nameField: FieldConfig = {
  name: "name",
  label: "Name",
  type: "text",
  required: true,
  listed: true,
};
const sortField: FieldConfig = {
  name: "sort_order",
  label: "Sort order",
  type: "number",
  listed: true,
};
const regionField: FieldConfig = {
  name: "region_code",
  label: "Region",
  type: "select",
  required: true,
  optionSource: "regions",
  listed: true,
};

export const REFERENCE_TABLES: Record<ReferenceTableKey, TableConfig> = {
  programs: {
    key: "programs",
    label: "Programs",
    description: "Courses that content belongs to (§92).",
    idColumn: "id",
    softDelete: true,
    orderBy: "name",
    fields: [
      nameField,
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        listed: true,
        options: [
          { value: "active", label: "Active" },
          { value: "upcoming", label: "Upcoming" },
          { value: "retired", label: "Retired" },
        ],
      },
      {
        name: "location",
        label: "Location",
        type: "text",
        listed: true,
        help: "Descriptive only; region lives on the Content Record.",
      },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  campaigns: {
    key: "campaigns",
    label: "Campaigns",
    description: "Time-boxed pushes, usually under a program (§93).",
    idColumn: "id",
    softDelete: true,
    orderBy: "name",
    fields: [
      nameField,
      {
        name: "program_id",
        label: "Program",
        type: "select",
        optionSource: "programs",
        listed: true,
      },
      { name: "start_date", label: "Start", type: "date", listed: true },
      { name: "end_date", label: "End", type: "date", listed: true },
      { name: "owner_id", label: "Owner", type: "select", optionSource: "profiles", listed: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        listed: true,
        options: [
          { value: "planned", label: "Planned" },
          { value: "active", label: "Active" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
        ],
      },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  campuses: {
    key: "campuses",
    label: "Campuses",
    description:
      "Campus-specific content must carry that campus's contact details. Generic rows mean handle only.",
    idColumn: "id",
    softDelete: true,
    orderBy: "name",
    fields: [
      regionField,
      nameField,
      { name: "phone", label: "Phone", type: "text", listed: true },
      { name: "address", label: "Address", type: "textarea", listed: true },
      {
        name: "is_generic",
        label: "Generic (no campus contact block)",
        type: "boolean",
        listed: true,
      },
    ],
  },
  platforms: {
    key: "platforms",
    label: "Platforms",
    description: "Social platforms content is published on (§94).",
    idColumn: "id",
    softDelete: true,
    orderBy: "sort_order",
    fields: [keyField, nameField, sortField],
  },
  objectives: {
    key: "objectives",
    label: "Marketing objectives",
    description: "One primary, optional secondary per record (§19).",
    idColumn: "id",
    softDelete: true,
    orderBy: "sort_order",
    fields: [keyField, nameField, sortField],
  },
  content_pillars: {
    key: "content_pillars",
    label: "Content pillars",
    description:
      "One per record (§20). Human-only pillars ban synthetic humans standing in for real students.",
    idColumn: "id",
    softDelete: true,
    orderBy: "sort_order",
    fields: [
      keyField,
      nameField,
      {
        name: "human_only",
        label: "Human only (no synthetic people)",
        type: "boolean",
        listed: true,
      },
      sortField,
    ],
  },
  differentiators: {
    key: "differentiators",
    label: "Brand differentiators",
    description: "What a piece claims about TechSkills; the script gate checks they appear (§21).",
    idColumn: "id",
    softDelete: true,
    orderBy: "sort_order",
    fields: [keyField, nameField, sortField],
  },
  content_types: {
    key: "content_types",
    label: "Content types",
    description:
      "Every request must name a type, or declare itself a One-off, so nothing bypasses the script gate (S1).",
    idColumn: "id",
    softDelete: true,
    orderBy: "sort_order",
    fields: [
      keyField,
      nameField,
      {
        name: "medium",
        label: "Medium",
        type: "select",
        required: true,
        listed: true,
        options: [
          { value: "video", label: "Video" },
          { value: "static", label: "Static" },
          { value: "carousel", label: "Carousel" },
          { value: "caption", label: "Caption" },
          { value: "thumbnail", label: "Thumbnail" },
          { value: "story", label: "Story" },
          { value: "one_off", label: "One-off" },
        ],
      },
      {
        name: "script_shape",
        label: "Script shape",
        type: "select",
        required: true,
        listed: true,
        options: [
          { value: "spoken", label: "Spoken script" },
          { value: "copy_spec", label: "Copy spec (headline / body / CTA)" },
          { value: "caption", label: "Caption" },
          { value: "shot_list", label: "Shot list" },
          { value: "none", label: "None" },
        ],
      },
      sortField,
    ],
  },
  reference_handles: {
    key: "reference_handles",
    label: "Social handles",
    description:
      "Active handles per region and platform. Inactive rows are RETIRED: their appearance on any asset is a defect the creative gate flags.",
    idColumn: "id",
    softDelete: true,
    orderBy: "handle",
    banner:
      "Inactive means retired, not hidden. Keep retired handles here so the gate can catch them.",
    fields: [
      regionField,
      {
        name: "platform_id",
        label: "Platform",
        type: "select",
        required: true,
        optionSource: "platforms",
        listed: true,
      },
      {
        name: "handle",
        label: "Handle",
        type: "text",
        required: true,
        listed: true,
        help: "Include the @.",
      },
      { name: "note", label: "Note", type: "text", listed: true },
    ],
  },
  brand_facts: {
    key: "brand_facts",
    label: "Brand facts",
    description:
      "Palette, fonts, logo rules, voice and taglines injected into every AI evaluation prompt. Values are JSON.",
    idColumn: "key",
    softDelete: false,
    orderBy: "key",
    fields: [
      {
        name: "key",
        label: "Key",
        type: "text",
        required: true,
        pattern: KEY_PATTERN,
        patternHint: KEY_HINT,
        listed: true,
        immutableOnEdit: true,
      },
      {
        name: "value",
        label: "Value (JSON)",
        type: "json",
        required: true,
        listed: true,
        help: "Any valid JSON: an object, an array, or a string.",
      },
    ],
  },
};

export const REFERENCE_TABLE_ORDER: ReferenceTableKey[] = [
  "programs",
  "campaigns",
  "campuses",
  "platforms",
  "objectives",
  "content_pillars",
  "differentiators",
  "content_types",
  "reference_handles",
  "brand_facts",
];

export function isReferenceTableKey(v: string | undefined | null): v is ReferenceTableKey {
  return !!v && v in REFERENCE_TABLES;
}
