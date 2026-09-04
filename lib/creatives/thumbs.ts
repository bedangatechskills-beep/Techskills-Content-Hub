import "server-only";
import { createClient } from "@/lib/supabase/server";

export const THUMB_URL_TTL = 60 * 30;

export interface CreativeThumbData {
  creative_version_id: string;
  version_no: number;
  kind: string;
  mime: string | null;
  file_name: string;
  signed_url: string | null;
}

/**
 * Signed preview URLs for the creative that represents each record: the
 * approved version when one exists, otherwise the current one. Private bucket,
 * so URLs are short-lived and minted per request.
 */
export async function getCreativeThumbsForContent(
  contentIds: string[],
): Promise<Map<string, CreativeThumbData>> {
  const out = new Map<string, CreativeThumbData>();
  const ids = [...new Set(contentIds.filter(Boolean))];
  if (ids.length === 0) return out;
  const supabase = await createClient();
  const { data: recs } = await supabase
    .from("content_records")
    .select("id, approved_creative_version_id, current_creative_version_id")
    .in("id", ids);
  const versionByContent = new Map<string, string>();
  for (const r of recs ?? []) {
    const v = r.approved_creative_version_id ?? r.current_creative_version_id;
    if (v) versionByContent.set(r.id, v);
  }
  const versionIds = [...new Set(versionByContent.values())];
  if (versionIds.length === 0) return out;
  const { data: versions } = await supabase
    .from("creative_versions")
    .select("id, version_no, kind, mime, file_name, storage_path")
    .in("id", versionIds);
  const paths = (versions ?? []).map((v) => v.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("creatives").createSignedUrls(paths, THUMB_URL_TTL)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
  const byVersion = new Map(
    (versions ?? []).map((v) => [
      v.id,
      {
        creative_version_id: v.id,
        version_no: v.version_no,
        kind: v.kind,
        mime: v.mime,
        file_name: v.file_name,
        signed_url: urlByPath.get(v.storage_path) ?? null,
      } satisfies CreativeThumbData,
    ]),
  );
  for (const [contentId, versionId] of versionByContent) {
    const t = byVersion.get(versionId);
    if (t) out.set(contentId, t);
  }
  return out;
}

/** Signed preview for one specific creative version. */
export async function getCreativeThumb(
  versionId: string | null,
): Promise<CreativeThumbData | null> {
  if (!versionId) return null;
  const supabase = await createClient();
  const { data: v } = await supabase
    .from("creative_versions")
    .select("id, version_no, kind, mime, file_name, storage_path")
    .eq("id", versionId)
    .maybeSingle();
  if (!v) return null;
  const { data: signed } = await supabase.storage
    .from("creatives")
    .createSignedUrl(v.storage_path, THUMB_URL_TTL);
  return {
    creative_version_id: v.id,
    version_no: v.version_no,
    kind: v.kind,
    mime: v.mime,
    file_name: v.file_name,
    signed_url: signed?.signedUrl ?? null,
  };
}
