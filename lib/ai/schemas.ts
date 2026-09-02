// Shared by the Next.js app (Node) and the Supabase Edge Function (Deno).
// Keep this file free of Node-only imports. `zod` resolves through
// node_modules in Node and through supabase/functions/deno.json in Deno.
import { z } from "zod";

export const SCRIPT_PROMPT_VERSION = "script.v1";

/** The nine spec categories (§26), scored 0–10. */
export const SCRIPT_CATEGORIES = [
  "hook_attention",
  "message_clarity",
  "audience_relevance",
  "techskills_differentiation",
  "premium_positioning",
  "professional_wording",
  "cta",
  "short_form_suitability",
  "overall_quality",
] as const;
export type ScriptCategory = (typeof SCRIPT_CATEGORIES)[number];

export const SCRIPT_CATEGORY_LABEL: Record<ScriptCategory, string> = {
  hook_attention: "Hook / Attention",
  message_clarity: "Message Clarity",
  audience_relevance: "Audience Relevance",
  techskills_differentiation: "TechSkills Differentiation",
  premium_positioning: "Premium Positioning",
  professional_wording: "Professional Wording",
  cta: "CTA",
  short_form_suitability: "Short-Form Suitability",
  overall_quality: "Overall Quality",
};

/** Hard compliance flags (S7). Legal or factual, not stylistic. */
export const HARD_FLAG_KEYS = [
  "spelling_grammar_en",
  "nepali_verify",
  "outcome_or_salary_claim",
  "visa_advice",
  "missing_source",
  "active_it_not_transparent",
  "wrong_region_language",
  "retired_handle",
  "fact_mismatch",
  "cta_missing_or_mismatch",
] as const;
export type HardFlagKey = (typeof HARD_FLAG_KEYS)[number];

export const HARD_FLAG_LABEL: Record<HardFlagKey, string> = {
  spelling_grammar_en: "Spelling / grammar (English)",
  nepali_verify: "Nepali text — needs human verification",
  outcome_or_salary_claim: "Outcome or salary claim",
  visa_advice: "Visa / migration advice",
  missing_source: "Claim without a source",
  active_it_not_transparent: "Active IT not framed transparently",
  wrong_region_language: "Wrong-region language",
  retired_handle: "Retired handle",
  fact_mismatch: "Fact does not match the record",
  cta_missing_or_mismatch: "CTA missing or does not match",
};

export const hardFlagSchema = z.object({
  key: z.enum(HARD_FLAG_KEYS),
  severity: z.enum(["high", "medium", "low"]),
  excerpt: z.string().describe("The exact text from the script that triggered the flag"),
  fix: z.string().describe("The specific fix, one or two sentences"),
  needs_human: z.boolean().describe("true when a person must decide, e.g. Nepali text"),
});
export type HardFlag = z.infer<typeof hardFlagSchema>;

export const recommendationSchema = z.object({
  category: z.enum(SCRIPT_CATEGORIES),
  issue: z.string(),
  suggested_fix: z.string(),
});

const scoreShape = Object.fromEntries(SCRIPT_CATEGORIES.map((k) => [k, z.number()])) as Record<
  ScriptCategory,
  z.ZodNumber
>;

/** Shape the provider must return. No numeric bounds (structured-output friendly). */
export const scriptEvaluationOutputSchema = z.object({
  category_scores: z.object(scoreShape),
  overall_score: z.number(),
  recommendations: z.array(recommendationSchema),
  hard_flags: z.array(hardFlagSchema),
  verdict: z.enum(["ready", "minor_issues", "significant_issues"]),
  summary: z.string().describe("Two sentences at most, for the approver"),
});

/** Strict validation applied before anything is stored. */
export const scriptEvaluationSchema = scriptEvaluationOutputSchema.extend({
  category_scores: z.object(
    Object.fromEntries(SCRIPT_CATEGORIES.map((k) => [k, z.number().min(0).max(10)])) as Record<
      ScriptCategory,
      z.ZodNumber
    >,
  ),
  overall_score: z.number().min(0).max(10),
  recommendations: z.array(recommendationSchema).max(3),
});
export type ScriptEvaluation = z.infer<typeof scriptEvaluationSchema>;

/** Everything the prompt needs, assembled from the Content Record (§26 inputs). */
export const scriptEvaluationInputSchema = z.object({
  script: z.string().min(1),
  script_shape: z.string(),
  today: z.string().describe("YYYY-MM-DD"),
  content: z.object({
    content_id: z.string(),
    title: z.string(),
    region_code: z.enum(["AU", "NP"]),
    campus_name: z.string().nullable(),
    content_type: z.string(),
    platforms: z.array(z.string()),
    target_audience: z.string().nullable(),
    objective: z.string().nullable(),
    hook: z.string().nullable(),
    core_message: z.string().nullable(),
    audience_takeaway: z.string().nullable(),
    cta: z.string().nullable(),
    differentiators: z.array(z.string()),
    target_publish_date: z.string().nullable(),
  }),
  reference: z.object({
    active_handles: z.array(z.object({ platform: z.string(), handle: z.string() })),
    retired_handles: z.array(z.string()),
    campuses: z.array(
      z.object({ name: z.string(), phone: z.string().nullable(), address: z.string().nullable() }),
    ),
    taglines: z.array(z.string()),
  }),
});
export type ScriptEvaluationInput = z.infer<typeof scriptEvaluationInputSchema>;
