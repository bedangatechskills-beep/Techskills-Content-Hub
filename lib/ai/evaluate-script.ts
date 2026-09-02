// Runtime-neutral orchestration: build the prompt, hash the input, call the
// provider, validate. Used by the Edge Function and by unit tests.
import type { AIProvider } from "./provider.ts";
import { buildScriptUserPrompt, SCRIPT_SYSTEM_PROMPT } from "./prompts/script.v1.ts";
import {
  SCRIPT_PROMPT_VERSION,
  scriptEvaluationInputSchema,
  type ScriptEvaluation,
  type ScriptEvaluationInput,
} from "./schemas.ts";

export interface ScriptEvaluationRun {
  evaluation: ScriptEvaluation;
  provider: string;
  model: string;
  prompt_version: string;
  input_hash: string;
  duration_ms: number;
  raw: unknown;
}

export function buildScriptPrompt(input: ScriptEvaluationInput) {
  return { system: SCRIPT_SYSTEM_PROMPT, user: buildScriptUserPrompt(input) };
}

/** SHA-256 over prompt version + provider model + user prompt. Same input → same hash. */
export async function scriptInputHash(
  input: ScriptEvaluationInput,
  model: string,
): Promise<string> {
  const text = `${SCRIPT_PROMPT_VERSION}\n${model}\n${buildScriptUserPrompt({ ...input, today: "" })}`;
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function runScriptEvaluation(
  rawInput: unknown,
  provider: AIProvider,
): Promise<ScriptEvaluationRun> {
  const input = scriptEvaluationInputSchema.parse(rawInput);
  const prompt = buildScriptPrompt(input);
  const started = Date.now();
  const result = await provider.evaluateScript(input, prompt);
  return {
    evaluation: result.evaluation,
    provider: provider.name,
    model: result.model,
    prompt_version: SCRIPT_PROMPT_VERSION,
    input_hash: await scriptInputHash(input, provider.model),
    duration_ms: Date.now() - started,
    raw: result.raw,
  };
}
