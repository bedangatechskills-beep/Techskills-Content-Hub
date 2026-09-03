// Runtime-neutral orchestration for the creative gate.
import type { AIProvider, ImageAttachment } from "./provider.ts";
import { buildCreativeUserPrompt, CREATIVE_SYSTEM_PROMPT } from "./prompts/creative.v1.ts";
import {
  CREATIVE_PROMPT_VERSION,
  creativeEvaluationInputSchema,
  type CreativeEvaluation,
  type CreativeEvaluationInput,
} from "./creative-schemas.ts";

export interface CreativeEvaluationRun {
  evaluation: CreativeEvaluation;
  provider: string;
  model: string;
  prompt_version: string;
  input_hash: string;
  duration_ms: number;
  raw: unknown;
}

export function buildCreativePrompt(input: CreativeEvaluationInput) {
  return { system: CREATIVE_SYSTEM_PROMPT, user: buildCreativeUserPrompt(input) };
}

/** Hash over prompt version, model, the prompt text and the image bytes' digest. */
export async function creativeInputHash(
  input: CreativeEvaluationInput,
  model: string,
  imageDigest: string,
): Promise<string> {
  const text = `${CREATIVE_PROMPT_VERSION}\n${model}\n${imageDigest}\n${buildCreativeUserPrompt({ ...input, today: "" })}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function digestBytes(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function runCreativeEvaluation(
  rawInput: unknown,
  provider: AIProvider,
  images: ImageAttachment[],
  imageDigest = "",
): Promise<CreativeEvaluationRun> {
  const input = creativeEvaluationInputSchema.parse(rawInput);
  const prompt = buildCreativePrompt(input);
  const started = Date.now();
  const result = await provider.evaluateCreative(input, prompt, images);
  return {
    evaluation: result.evaluation,
    provider: provider.name,
    model: result.model,
    prompt_version: CREATIVE_PROMPT_VERSION,
    input_hash: await creativeInputHash(input, provider.model, imageDigest),
    duration_ms: Date.now() - started,
    raw: result.raw,
  };
}
