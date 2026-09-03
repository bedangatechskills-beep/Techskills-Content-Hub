// evaluate-creative — runs the AI Creative & Brand Score for one creative version.
// 1. Verifies the caller may run it (RPC as the caller).
// 2. Loads the version, record, approved copy and reference data (service role).
// 3. Downloads the file from the private bucket; images are attached to the
//    vision prompt as base64 (videos: metadata only, no frame sampling yet).
// 4. Cost guard + idempotency, provider call, validation.
// 5. Stores through record_creative_evaluation (service-only RPC).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { getProvider, type ImageAttachment } from "../../../lib/ai/provider.ts";
import { creativeInputHash, digestBytes, runCreativeEvaluation } from "../../../lib/ai/evaluate-creative.ts";
import { expectedFormatKey, platformFormatSchema, type CreativeEvaluationInput } from "../../../lib/ai/creative-schemas.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_IMAGE_BYTES = 4_500_000; // stay under the model's request limits

interface Body {
  creative_version_id: string;
  force?: boolean;
  source?: "manual" | "auto";
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "missing Authorization" }, 401);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  if (!body.creative_version_id) return json({ error: "creative_version_id required" }, 400);

  const asCaller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: access } = await asCaller.rpc("my_access");
  const requesterId: string | undefined = access?.profile?.id;
  const { data: allowed, error: allowErr } = await asCaller.rpc("can_run_creative_evaluation", { p_version_id: body.creative_version_id });
  if (allowErr) return json({ error: allowErr.message }, 400);
  if (!allowed || !requesterId) return json({ error: "you may not run evaluations on this creative" }, 403);

  const { data: cv } = await admin.from("creative_versions").select("*").eq("id", body.creative_version_id).single();
  if (!cv) return json({ error: "creative version not found" }, 404);

  const [{ data: record }, { data: platforms }, { data: diffs }, { data: handles }, { data: campuses }, { data: facts }, { data: settings }] =
    await Promise.all([
      admin
        .from("content_records")
        .select("id, content_id, title, region_code, campus_id, content_type_id, objective_id, pillar_id, hook, core_message, cta, target_publish_date, approved_script_version_id, current_script_version_id")
        .eq("id", cv.content_id)
        .single(),
      admin.from("content_platforms").select("platforms(name, key)").eq("content_id", cv.content_id),
      admin.from("content_differentiators").select("differentiators(name)").eq("content_id", cv.content_id),
      admin.from("reference_handles").select("handle, is_active, region_code, platforms(name)"),
      admin.from("campuses").select("name, phone, address, region_code, is_generic"),
      admin.from("brand_facts").select("key, value"),
      admin.from("app_settings").select("key, value").in("key", ["creative_eval_max_per_hour"]),
    ]);
  if (!record) return json({ error: "content record not found" }, 404);

  const [{ data: ctype }, { data: objective }, { data: pillar }, { data: campus }, { data: script }] = await Promise.all([
    admin.from("content_types").select("name, key, medium").eq("id", record.content_type_id).single(),
    record.objective_id ? admin.from("objectives").select("name").eq("id", record.objective_id).single() : Promise.resolve({ data: null }),
    record.pillar_id ? admin.from("content_pillars").select("name, human_only").eq("id", record.pillar_id).single() : Promise.resolve({ data: null }),
    record.campus_id ? admin.from("campuses").select("name").eq("id", record.campus_id).single() : Promise.resolve({ data: null }),
    record.approved_script_version_id ?? record.current_script_version_id
      ? admin.from("script_versions").select("body").eq("id", record.approved_script_version_id ?? record.current_script_version_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const nameOf = (x: unknown): { name?: string; key?: string } => {
    const o = x as { name?: string; key?: string } | { name?: string; key?: string }[] | null;
    return Array.isArray(o) ? (o[0] ?? {}) : (o ?? {});
  };
  const factMap = new Map((facts ?? []).map((f) => [f.key, f.value as unknown]));
  const formats = (factMap.get("platform_formats") ?? {}) as Record<string, unknown>;
  const fmtKey = expectedFormatKey(ctype?.key ?? "", ctype?.medium ?? "static");
  const fmtParsed = platformFormatSchema.safeParse(formats[fmtKey]);
  const palette = (factMap.get("palette") ?? {}) as Record<string, unknown> | string[];
  const fonts = (factMap.get("fonts") ?? {}) as Record<string, unknown> | string[];
  const paletteList = Array.isArray(palette) ? palette.map(String) : Object.values(palette).map(String);
  const fontList = Array.isArray(fonts) ? fonts.map(String) : Object.values(fonts).map(String);
  const platformNames = (platforms ?? []).map((p) => nameOf(p.platforms).name ?? "").filter(Boolean);

  // Download the asset; attach images to the vision prompt.
  const images: ImageAttachment[] = [];
  let imageDigest = "";
  const mime = cv.mime ?? "";
  if (mime.startsWith("image/") && mime !== "image/svg+xml") {
    const { data: file, error: dlErr } = await admin.storage.from("creatives").download(cv.storage_path);
    if (dlErr || !file) return json({ error: `could not read the creative file: ${dlErr?.message ?? "unknown"}` }, 500);
    const bytes = new Uint8Array(await file.arrayBuffer());
    imageDigest = await digestBytes(bytes);
    if (bytes.length <= MAX_IMAGE_BYTES) {
      images.push({ media_type: mime as ImageAttachment["media_type"], base64: toBase64(bytes), label: cv.file_name });
    }
  }

  const input: CreativeEvaluationInput = {
    today: new Date().toISOString().slice(0, 10),
    creative: {
      version_no: cv.version_no,
      kind: cv.kind,
      file_name: cv.file_name,
      mime: cv.mime,
      width: cv.width,
      height: cv.height,
      duration_s: cv.duration_s == null ? null : Number(cv.duration_s),
      note: cv.note,
      image_attached: images.length > 0,
    },
    approved_copy: script?.body ?? null,
    content: {
      content_id: record.content_id,
      title: record.title,
      region_code: record.region_code as "AU" | "NP",
      campus_name: campus?.name ?? null,
      content_type: ctype?.name ?? "",
      content_type_key: ctype?.key ?? "",
      medium: ctype?.medium ?? "static",
      platforms: platformNames,
      objective: objective?.name ?? null,
      pillar: pillar?.name ?? null,
      pillar_human_only: !!pillar?.human_only,
      hook: record.hook,
      core_message: record.core_message,
      cta: record.cta,
      target_publish_date: record.target_publish_date,
      differentiators: (diffs ?? []).map((d) => nameOf(d.differentiators).name ?? "").filter(Boolean),
      is_crosspost_to_au: record.region_code === "NP" && platformNames.length > 0 && false,
    },
    reference: {
      active_handles: (handles ?? [])
        .filter((h) => h.is_active && h.region_code === record.region_code)
        .map((h) => ({ platform: nameOf(h.platforms).name ?? "", handle: h.handle })),
      retired_handles: [...new Set((handles ?? []).filter((h) => !h.is_active).map((h) => h.handle))],
      campuses: (campuses ?? [])
        .filter((c) => c.region_code === record.region_code && !c.is_generic)
        .map((c) => ({ name: c.name, phone: c.phone, address: c.address })),
      taglines: Array.isArray(factMap.get("taglines")) ? (factMap.get("taglines") as string[]) : [],
      expected_format: fmtParsed.success ? fmtParsed.data : null,
      brand_facts_configured: paletteList.length > 0 || fontList.length > 0,
      palette: paletteList,
      fonts: fontList,
    },
  };

  let provider;
  try {
    provider = await getProvider({
      AI_PROVIDER: Deno.env.get("AI_PROVIDER") ?? "mock",
      ANTHROPIC_API_KEY: Deno.env.get("ANTHROPIC_API_KEY") ?? undefined,
      ANTHROPIC_MODEL: Deno.env.get("ANTHROPIC_MODEL") ?? undefined,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }

  // Idempotency and cost guard
  const hash = await creativeInputHash(input, provider.model, imageDigest);
  if (!body.force) {
    const { data: existing } = await admin
      .from("ai_evaluations")
      .select("*")
      .eq("creative_version_id", cv.id)
      .eq("input_hash", hash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return json({ evaluation: existing, reused: true });
  }
  const maxPerHour = Number((settings ?? []).find((s) => s.key === "creative_eval_max_per_hour")?.value ?? 3);
  const { count } = await admin
    .from("ai_evaluations")
    .select("id", { count: "exact", head: true })
    .eq("creative_version_id", cv.id)
    .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= maxPerHour && body.source === "auto") {
    return json({ error: `cost guard: ${maxPerHour} automatic evaluations per version per hour reached` }, 429);
  }

  let run;
  try {
    run = await runCreativeEvaluation(input, provider, images, imageDigest);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("evaluate-creative provider error", msg);
    return json({ error: `AI evaluation failed: ${msg}` }, 502);
  }

  const { data: stored, error: storeErr } = await admin.rpc("record_creative_evaluation", {
    p: {
      creative_version_id: cv.id,
      provider: run.provider,
      model: run.model,
      prompt_version: run.prompt_version,
      input_hash: run.input_hash,
      overall_score: run.evaluation.overall_score,
      category_scores: run.evaluation.category_scores,
      recommendations: run.evaluation.recommendations,
      hard_flags: run.evaluation.hard_flags,
      verdict: run.evaluation.verdict,
      summary: run.evaluation.summary,
      raw_response: { ...(run.raw as object), group2_status: run.evaluation.group2_status, observed_text: run.evaluation.observed_text, image_attached: images.length > 0 },
      requested_by: requesterId,
      duration_ms: run.duration_ms,
    },
  });
  if (storeErr) return json({ error: storeErr.message }, 500);
  console.log(JSON.stringify({ event: "evaluate-creative", version: cv.id, provider: run.provider, model: run.model, ms: run.duration_ms, images: images.length }));
  return json({ evaluation: stored, reused: false });
});
