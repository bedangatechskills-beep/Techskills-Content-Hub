// evaluate-script — runs the AI Script Score for one script version.
// 1. Verifies the caller (their JWT) may run evaluations, via an RPC as them.
// 2. Loads the version, record and reference data with the service role.
// 3. Builds the prompt, calls the provider chosen by AI_PROVIDER, validates.
// 4. Stores the evaluation through record_ai_evaluation (service-only RPC),
//    which also writes the activity log and notifications.
// The AI never moves a stage or approves anything; it only stores a verdict.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { getProvider } from "../../../lib/ai/provider.ts";
import { runScriptEvaluation, scriptInputHash } from "../../../lib/ai/evaluate-script.ts";
import type { ScriptEvaluationInput } from "../../../lib/ai/schemas.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Body {
  script_version_id: string;
  force?: boolean; // re-run even when an identical input was already evaluated
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
  if (!body.script_version_id) return json({ error: "script_version_id required" }, 400);

  const asCaller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  // Who is asking, and may they?
  const { data: access } = await asCaller.rpc("my_access");
  const requesterId: string | undefined = access?.profile?.id;
  const { data: allowed, error: allowErr } = await asCaller.rpc("can_run_script_evaluation", {
    p_version_id: body.script_version_id,
  });
  if (allowErr) return json({ error: allowErr.message }, 400);
  if (!allowed || !requesterId) return json({ error: "you may not run evaluations on this version" }, 403);

  // Load everything the prompt needs.
  const { data: version, error: vErr } = await admin
    .from("script_versions")
    .select("id, content_id, version_no, body, script_shape")
    .eq("id", body.script_version_id)
    .single();
  if (vErr || !version) return json({ error: "script version not found" }, 404);

  const [{ data: record }, { data: platforms }, { data: diffs }, { data: handles }, { data: campuses }, { data: taglines }] =
    await Promise.all([
      admin
        .from("content_records")
        .select(
          "id, content_id, title, region_code, campus_id, target_audience, hook, core_message, audience_takeaway, cta, target_publish_date, content_type_id, objective_id",
        )
        .eq("id", version.content_id)
        .single(),
      admin.from("content_platforms").select("platform_id, platforms(name)").eq("content_id", version.content_id),
      admin
        .from("content_differentiators")
        .select("differentiator_id, differentiators(name)")
        .eq("content_id", version.content_id),
      admin.from("reference_handles").select("handle, is_active, region_code, platforms(name)"),
      admin.from("campuses").select("name, phone, address, region_code, is_generic"),
      admin.from("brand_facts").select("value").eq("key", "taglines").maybeSingle(),
    ]);
  if (!record) return json({ error: "content record not found" }, 404);

  const [{ data: ctype }, { data: objective }, { data: campus }] = await Promise.all([
    admin.from("content_types").select("name").eq("id", record.content_type_id).single(),
    record.objective_id ? admin.from("objectives").select("name").eq("id", record.objective_id).single() : Promise.resolve({ data: null }),
    record.campus_id ? admin.from("campuses").select("name").eq("id", record.campus_id).single() : Promise.resolve({ data: null }),
  ]);

  const nameOf = (x: unknown): string => {
    const o = x as { name?: string } | { name?: string }[] | null;
    if (Array.isArray(o)) return o[0]?.name ?? "";
    return o?.name ?? "";
  };

  const input: ScriptEvaluationInput = {
    script: version.body,
    script_shape: version.script_shape,
    today: new Date().toISOString().slice(0, 10),
    content: {
      content_id: record.content_id,
      title: record.title,
      region_code: record.region_code as "AU" | "NP",
      campus_name: campus?.name ?? null,
      content_type: ctype?.name ?? "",
      platforms: (platforms ?? []).map((p) => nameOf(p.platforms)).filter(Boolean),
      target_audience: record.target_audience,
      objective: objective?.name ?? null,
      hook: record.hook,
      core_message: record.core_message,
      audience_takeaway: record.audience_takeaway,
      cta: record.cta,
      differentiators: (diffs ?? []).map((d) => nameOf(d.differentiators)).filter(Boolean),
      target_publish_date: record.target_publish_date,
    },
    reference: {
      active_handles: (handles ?? [])
        .filter((h) => h.is_active && h.region_code === record.region_code)
        .map((h) => ({ platform: nameOf(h.platforms), handle: h.handle })),
      retired_handles: [...new Set((handles ?? []).filter((h) => !h.is_active).map((h) => h.handle))],
      campuses: (campuses ?? [])
        .filter((c) => c.region_code === record.region_code && !c.is_generic)
        .map((c) => ({ name: c.name, phone: c.phone, address: c.address })),
      taglines: Array.isArray(taglines?.value) ? (taglines!.value as string[]) : [],
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

  // Idempotency: same version + same input + same model → reuse.
  if (!body.force) {
    const hash = await scriptInputHash(input, provider.model);
    const { data: existing } = await admin
      .from("ai_evaluations")
      .select("*")
      .eq("script_version_id", version.id)
      .eq("input_hash", hash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return json({ evaluation: existing, reused: true });
  }

  let run;
  try {
    run = await runScriptEvaluation(input, provider);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("evaluate-script provider error", msg);
    return json({ error: `AI evaluation failed: ${msg}` }, 502);
  }

  const { data: stored, error: storeErr } = await admin.rpc("record_ai_evaluation", {
    p: {
      script_version_id: version.id,
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
      raw_response: run.raw,
      requested_by: requesterId,
      duration_ms: run.duration_ms,
    },
  });
  if (storeErr) return json({ error: storeErr.message }, 500);

  console.log(
    JSON.stringify({ event: "evaluate-script", version: version.id, provider: run.provider, model: run.model, ms: run.duration_ms }),
  );
  return json({ evaluation: stored, reused: false });
});
