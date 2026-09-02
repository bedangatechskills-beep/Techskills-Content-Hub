import "server-only";
import { createClient } from "@/lib/supabase/server";
import { REFERENCE_TABLES, type OptionSource, type ReferenceTableKey } from "./tables";

export type ReferenceRow = Record<string, unknown>;

export interface ReferenceOptions {
  regions: { value: string; label: string }[];
  programs: { value: string; label: string }[];
  platforms: { value: string; label: string }[];
  profiles: { value: string; label: string }[];
}

export async function listReferenceRows(table: ReferenceTableKey): Promise<ReferenceRow[]> {
  const supabase = await createClient();
  const cfg = REFERENCE_TABLES[table];
  const { data, error } = await supabase.from(table).select("*").order(cfg.orderBy);
  if (error) throw new Error(error.message);
  return (data ?? []) as ReferenceRow[];
}

export async function getReferenceOptions(): Promise<ReferenceOptions> {
  const supabase = await createClient();
  const [regions, programs, platforms, profiles] = await Promise.all([
    supabase.from("regions").select("code, name").order("code"),
    supabase.from("programs").select("id, name, is_active").order("name"),
    supabase.from("platforms").select("id, name, is_active").order("sort_order"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("account_status", "active")
      .order("full_name"),
  ]);
  return {
    regions: (regions.data ?? []).map((r) => ({ value: r.code, label: `${r.code} — ${r.name}` })),
    programs: (programs.data ?? []).map((p) => ({
      value: p.id,
      label: p.is_active ? p.name : `${p.name} (inactive)`,
    })),
    platforms: (platforms.data ?? []).map((p) => ({
      value: p.id,
      label: p.is_active ? p.name : `${p.name} (inactive)`,
    })),
    profiles: (profiles.data ?? []).map((p) => ({ value: p.id, label: p.full_name })),
  };
}

export function optionsFor(source: OptionSource, options: ReferenceOptions) {
  return options[source];
}
