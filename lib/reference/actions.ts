"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/access.server";
import type { ActionState } from "@/lib/auth/actions";
import {
  isReferenceTableKey,
  REFERENCE_TABLES,
  type FieldConfig,
  type ReferenceTableKey,
} from "./tables";

function fieldSchema(f: FieldConfig): z.ZodTypeAny {
  switch (f.type) {
    case "boolean":
      return z.boolean();
    case "number": {
      const n = z.coerce.number().int();
      return f.required ? n : n.nullable();
    }
    case "date": {
      const d = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${f.label}: use YYYY-MM-DD`);
      return f.required ? d : d.nullable();
    }
    case "json":
      return z.string().transform((s, ctx) => {
        try {
          return JSON.parse(s) as unknown;
        } catch {
          ctx.addIssue({ code: "custom", message: `${f.label} must be valid JSON` });
          return z.NEVER;
        }
      });
    case "select":
    case "text":
    case "textarea":
    default: {
      let s = z.string().trim();
      if (f.pattern) s = s.regex(f.pattern, `${f.label}: ${f.patternHint ?? "invalid format"}`);
      if (f.required) return s.min(1, `${f.label} is required`);
      return s.nullable();
    }
  }
}

function readField(formData: FormData, f: FieldConfig): unknown {
  if (f.type === "boolean") return formData.get(f.name) === "on";
  const raw = formData.get(f.name);
  if (raw == null) return f.type === "json" ? "" : null;
  const s = String(raw);
  if (s === "" && f.type !== "json") return null;
  return s;
}

/**
 * Create or update one reference row. Hidden inputs: `table`, optional `id`
 * (or `key` for brand_facts). Permission is checked here and again by RLS.
 */
export async function saveReferenceRow(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("admin.reference_data");
  const table = String(formData.get("table") ?? "");
  if (!isReferenceTableKey(table)) return { error: "Unknown reference table" };
  const cfg = REFERENCE_TABLES[table];
  const existingId = String(formData.get("_existing_id") ?? "") || null;

  const shape: Record<string, z.ZodTypeAny> = {};
  const raw: Record<string, unknown> = {};
  for (const f of cfg.fields) {
    if (existingId && f.immutableOnEdit) continue;
    shape[f.name] = fieldSchema(f);
    raw[f.name] = readField(formData, f);
  }
  const parsed = z.object(shape).safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  // Table name is dynamic, so use the untyped builder; RLS still applies.
  const db = supabase as unknown as SupabaseClient;
  const values = parsed.data as Record<string, unknown>;

  if (existingId) {
    if (table === "brand_facts") {
      const { data: me } = await supabase.rpc("auth_profile_id");
      values.updated_at = new Date().toISOString();
      values.updated_by = me ?? null;
    }
    const { error } = await db.from(table).update(values).eq(cfg.idColumn, existingId);
    if (error) return { error: error.message };
  } else {
    if (table === "brand_facts") {
      const { data: me } = await supabase.rpc("auth_profile_id");
      values.updated_by = me ?? null;
    }
    const { error } = await db.from(table).insert(values);
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/reference");
  revalidatePath("/content");
  return { success: existingId ? "Saved" : "Added" };
}

export async function toggleReferenceActive(
  table: ReferenceTableKey,
  id: string,
  value: boolean,
): Promise<ActionState> {
  await requirePermission("admin.reference_data");
  const cfg = REFERENCE_TABLES[table];
  if (!cfg.softDelete) return { error: "This table has no active flag" };
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseClient;
  const { error } = await db.from(table).update({ is_active: value }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/reference");
  revalidatePath("/content");
  return { success: value ? "Reactivated" : "Deactivated" };
}
