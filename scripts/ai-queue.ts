/**
 * Worker CLI for the "queue" AI provider. Used by whoever evaluates queued
 * requests by hand (today: the Claude Code session building the hub).
 *
 *   pnpm ai:queue list                       pending / processing requests
 *   pnpm ai:queue prepare <id> <out-dir>     writes prompt.txt, input.json and the image (if any); claims the request
 *   pnpm ai:queue complete <id> <result.json>  validates against the Zod schema, stores via record_*_evaluation, marks done
 *   pnpm ai:queue fail <id> "<reason>"
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from .env.local, or
 * AI_QUEUE_ENV=path to another env file, e.g. the hosted project's).
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import {
  scriptEvaluationSchema,
  SCRIPT_PROMPT_VERSION,
  type ScriptEvaluationInput,
} from "../lib/ai/schemas.ts";
import {
  creativeEvaluationSchema,
  CREATIVE_PROMPT_VERSION,
  type CreativeEvaluationInput,
} from "../lib/ai/creative-schemas.ts";
import { buildScriptPrompt, scriptInputHash } from "../lib/ai/evaluate-script.ts";
import { buildCreativePrompt, creativeInputHash } from "../lib/ai/evaluate-creative.ts";

config({ path: process.env.AI_QUEUE_ENV ?? ".env.local" });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const MODEL = "claude-code-session";
const PROVIDER = "queue";

async function list() {
  const { data, error } = await admin
    .from("ai_evaluation_requests")
    .select(
      "id, kind, status, content_id, script_version_id, creative_version_id, created_at, image_path",
    )
    .in("status", ["pending", "processing"])
    .order("created_at");
  if (error) throw error;
  if (!data?.length) {
    console.log("QUEUE_EMPTY");
    return;
  }
  const ids = [...new Set(data.map((r) => r.content_id))];
  const { data: recs } = await admin
    .from("content_records")
    .select("id, content_id, title")
    .in("id", ids);
  const byId = new Map((recs ?? []).map((r) => [r.id, r]));
  for (const r of data) {
    const rec = byId.get(r.content_id);
    console.log(
      `${r.id}\t${r.kind}\t${r.status}\t${rec?.content_id ?? ""}\t${rec?.title ?? ""}\t${r.created_at}`,
    );
  }
}

async function prepare(id: string, outDir: string) {
  const { data: req, error } = await admin
    .from("ai_evaluation_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !req) throw error ?? new Error("request not found");
  fs.mkdirSync(outDir, { recursive: true });
  {
    const { error: ce } = await admin.rpc("claim_ai_request", { p_request_id: id });
    if (ce) throw ce;
  }
  const input = req.input as unknown;
  const prompt =
    req.kind === "script"
      ? buildScriptPrompt(input as ScriptEvaluationInput)
      : buildCreativePrompt(input as CreativeEvaluationInput);
  fs.writeFileSync(path.join(outDir, "system.txt"), prompt.system);
  fs.writeFileSync(path.join(outDir, "prompt.txt"), prompt.user);
  fs.writeFileSync(path.join(outDir, "input.json"), JSON.stringify(input, null, 2));
  if (req.image_path) {
    const { data: file, error: dl } = await admin.storage
      .from("creatives")
      .download(req.image_path);
    if (dl || !file) console.log(`IMAGE_UNAVAILABLE ${dl?.message ?? ""}`);
    else {
      const ext = path.extname(req.image_path) || ".png";
      const target = path.join(outDir, `creative${ext}`);
      fs.writeFileSync(target, Buffer.from(await file.arrayBuffer()));
      console.log(`IMAGE ${target}`);
    }
  }
  console.log(`PREPARED ${req.kind} ${outDir}`);
}

async function complete(id: string, resultPath: string) {
  const { data: req, error } = await admin
    .from("ai_evaluation_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !req) throw error ?? new Error("request not found");
  const raw = JSON.parse(fs.readFileSync(resultPath, "utf8"));
  const started = Date.now();
  if (req.kind === "script") {
    const ev = scriptEvaluationSchema.parse({
      ...raw,
      recommendations: (raw.recommendations ?? []).slice(0, 3),
    });
    const input = req.input as ScriptEvaluationInput;
    const { data: stored, error: e } = await admin.rpc("record_ai_evaluation", {
      p: {
        script_version_id: req.script_version_id,
        provider: PROVIDER,
        model: MODEL,
        prompt_version: SCRIPT_PROMPT_VERSION,
        input_hash: await scriptInputHash(input, MODEL),
        overall_score: ev.overall_score,
        category_scores: ev.category_scores,
        recommendations: ev.recommendations,
        hard_flags: ev.hard_flags,
        verdict: ev.verdict,
        summary: ev.summary,
        raw_response: { provider: PROVIDER, request_id: id },
        requested_by: req.requested_by,
        duration_ms: Date.now() - started,
      },
    });
    if (e) throw e;
    {
      const { error: fe } = await admin.rpc("finish_ai_request", {
        p_request_id: id,
        p_evaluation_id: stored.id,
      });
      if (fe) throw fe;
    }
    console.log(`DONE script evaluation ${stored.id}`);
  } else {
    const ev = creativeEvaluationSchema.parse({
      ...raw,
      recommendations: (raw.recommendations ?? []).slice(0, 3),
    });
    const input = req.input as CreativeEvaluationInput;
    const { data: stored, error: e } = await admin.rpc("record_creative_evaluation", {
      p: {
        creative_version_id: req.creative_version_id,
        provider: PROVIDER,
        model: MODEL,
        prompt_version: CREATIVE_PROMPT_VERSION,
        input_hash: await creativeInputHash(input, MODEL, req.image_path ?? ""),
        overall_score: ev.overall_score,
        category_scores: ev.category_scores,
        recommendations: ev.recommendations,
        hard_flags: ev.hard_flags,
        verdict: ev.verdict,
        summary: ev.summary,
        raw_response: {
          provider: PROVIDER,
          request_id: id,
          group2_status: ev.group2_status,
          observed_text: ev.observed_text,
          image_attached: !!req.image_path,
        },
        requested_by: req.requested_by,
        duration_ms: Date.now() - started,
      },
    });
    if (e) throw e;
    {
      const { error: fe } = await admin.rpc("finish_ai_request", {
        p_request_id: id,
        p_evaluation_id: stored.id,
      });
      if (fe) throw fe;
    }
    console.log(`DONE creative evaluation ${stored.id}`);
  }
}

async function fail(id: string, reason: string) {
  const { error: fe } = await admin.rpc("finish_ai_request", { p_request_id: id, p_error: reason });
  if (fe) throw fe;
  console.log("FAILED", id);
}

const [cmd, a, b] = process.argv.slice(2);
(async () => {
  if (cmd === "list") await list();
  else if (cmd === "prepare" && a && b) await prepare(a, b);
  else if (cmd === "complete" && a && b) await complete(a, b);
  else if (cmd === "fail" && a) await fail(a, b ?? "failed");
  else {
    console.log(
      "usage: ai-queue list | prepare <id> <dir> | complete <id> <result.json> | fail <id> <reason>",
    );
    process.exit(1);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
