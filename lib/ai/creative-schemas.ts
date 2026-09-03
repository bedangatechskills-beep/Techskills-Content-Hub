// AI Creative & Brand Score — shared by Next (Node) and the Edge Function (Deno).
import { z } from "zod";

export const CREATIVE_PROMPT_VERSION = "creative.v1";

/** Spec categories (§37), 0–10. */
export const CREATIVE_CATEGORIES = [
  "visual_impact",
  "brand_consistency",
  "premium_appearance",
  "mobile_readability",
  "message_clarity",
  "brand_differentiation",
  "text_density",
  "cta_visibility",
  "overall_quality",
] as const;
export type CreativeCategory = (typeof CREATIVE_CATEGORIES)[number];

export const CREATIVE_CATEGORY_LABEL: Record<CreativeCategory, string> = {
  visual_impact: "Visual Impact",
  brand_consistency: "Brand Consistency",
  premium_appearance: "Premium Appearance",
  mobile_readability: "Mobile Readability",
  message_clarity: "Message Clarity",
  brand_differentiation: "Brand Differentiation",
  text_density: "Text Density",
  cta_visibility: "CTA Visibility",
  overall_quality: "Overall Quality",
};

/** Defect Rubric hard flags. Group 1 needs no brand facts; Group 2 does. */
export const CREATIVE_FLAG_KEYS = [
  // Group 1
  "spelling",
  "grammar",
  "fact_mismatch",
  "countdown_wrong",
  "phone_readability",
  "text_density",
  "pose_or_crop",
  "ai_artifact",
  "cta_missing",
  "contact_wrong",
  "wrong_region_language",
  "nepali_verify",
  "ai_disclosure_required",
  "synthetic_human_on_proof",
  "format_safe_zone", // D6
  // video
  "not_916",
  "no_hook_3s",
  "captions_missing",
  "english_subs_missing_on_crosspost",
  // Group 2 (brand facts required)
  "off_palette",
  "wrong_font",
  "logo_issue",
  "wrong_dimensions",
  "template_mismatch",
] as const;
export type CreativeFlagKey = (typeof CREATIVE_FLAG_KEYS)[number];

export const CREATIVE_FLAG_LABEL: Record<CreativeFlagKey, string> = {
  spelling: "Spelling",
  grammar: "Grammar / phrasing",
  fact_mismatch: "Fact does not match the record",
  countdown_wrong: "Countdown or date wrong",
  phone_readability: "Not readable on a phone",
  text_density: "Wall of text",
  pose_or_crop: "Awkward pose or bad crop",
  ai_artifact: "AI-image artifact",
  cta_missing: "CTA missing",
  contact_wrong: "Contact details or handle wrong",
  wrong_region_language: "Wrong-region language",
  nepali_verify: "Nepali text — needs human verification",
  ai_disclosure_required: "AI disclosure required at publish",
  synthetic_human_on_proof: "Synthetic human on a real-student story",
  format_safe_zone: "Format / safe zone (4:5, 10% margin)",
  not_916: "Video is not 9:16",
  no_hook_3s: "No hook in the first 3 seconds",
  captions_missing: "Captions missing",
  english_subs_missing_on_crosspost: "English subtitles missing on cross-post",
  off_palette: "Off-palette colour",
  wrong_font: "Wrong typeface",
  logo_issue: "Logo missing, wrong or distorted",
  wrong_dimensions: "Wrong dimensions for the platform",
  template_mismatch: "Template mismatch",
};

export const GROUP2_KEYS: CreativeFlagKey[] = [
  "off_palette",
  "wrong_font",
  "logo_issue",
  "wrong_dimensions",
  "template_mismatch",
];

export const creativeFlagSchema = z.object({
  key: z.enum(CREATIVE_FLAG_KEYS),
  severity: z.enum(["critical", "high", "medium", "low"]),
  excerpt: z
    .string()
    .describe(
      "The exact text or a short description of where on the asset (e.g. 'bottom-left handle')",
    ),
  fix: z.string(),
  needs_human: z.boolean(),
});
export type CreativeFlag = z.infer<typeof creativeFlagSchema>;

const scoreShape = Object.fromEntries(CREATIVE_CATEGORIES.map((k) => [k, z.number()])) as Record<
  CreativeCategory,
  z.ZodNumber
>;

export const creativeEvaluationOutputSchema = z.object({
  category_scores: z.object(scoreShape),
  overall_score: z.number(),
  recommendations: z.array(
    z.object({
      category: z.enum(CREATIVE_CATEGORIES),
      issue: z.string(),
      suggested_fix: z.string(),
    }),
  ),
  hard_flags: z.array(creativeFlagSchema),
  group2_status: z
    .enum(["checked", "not_configured"])
    .describe("not_configured when brand facts were empty"),
  verdict: z.enum(["ready_for_dm_review", "improve_before_review", "significant_issues"]),
  summary: z.string(),
  observed_text: z
    .string()
    .describe("All text you can read on the asset, verbatim, for the record"),
});

export const creativeEvaluationSchema = creativeEvaluationOutputSchema.extend({
  category_scores: z.object(
    Object.fromEntries(CREATIVE_CATEGORIES.map((k) => [k, z.number().min(0).max(10)])) as Record<
      CreativeCategory,
      z.ZodNumber
    >,
  ),
  overall_score: z.number().min(0).max(10),
  recommendations: z
    .array(
      z.object({
        category: z.enum(CREATIVE_CATEGORIES),
        issue: z.string(),
        suggested_fix: z.string(),
      }),
    )
    .max(3),
});
export type CreativeEvaluation = z.infer<typeof creativeEvaluationSchema>;

export const platformFormatSchema = z.object({
  ratio: z.string(),
  width: z.number(),
  height: z.number(),
  safe_margin_pct: z.number().default(10),
  note: z.string().optional(),
});
export type PlatformFormat = z.infer<typeof platformFormatSchema>;

export const creativeEvaluationInputSchema = z.object({
  today: z.string(),
  creative: z.object({
    version_no: z.number(),
    kind: z.enum(["image", "video", "carousel", "thumbnail", "other"]),
    file_name: z.string(),
    mime: z.string().nullable(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    duration_s: z.number().nullable(),
    note: z.string().nullable(),
    /** true when the asset itself was attached as an image for the model */
    image_attached: z.boolean(),
  }),
  approved_copy: z.string().nullable(),
  content: z.object({
    content_id: z.string(),
    title: z.string(),
    region_code: z.enum(["AU", "NP"]),
    campus_name: z.string().nullable(),
    content_type: z.string(),
    content_type_key: z.string(),
    medium: z.string(),
    platforms: z.array(z.string()),
    objective: z.string().nullable(),
    pillar: z.string().nullable(),
    pillar_human_only: z.boolean(),
    hook: z.string().nullable(),
    core_message: z.string().nullable(),
    cta: z.string().nullable(),
    target_publish_date: z.string().nullable(),
    differentiators: z.array(z.string()),
    is_crosspost_to_au: z.boolean(),
  }),
  reference: z.object({
    active_handles: z.array(z.object({ platform: z.string(), handle: z.string() })),
    retired_handles: z.array(z.string()),
    campuses: z.array(
      z.object({ name: z.string(), phone: z.string().nullable(), address: z.string().nullable() }),
    ),
    taglines: z.array(z.string()),
    expected_format: platformFormatSchema.nullable(),
    brand_facts_configured: z.boolean(),
    palette: z.array(z.string()),
    fonts: z.array(z.string()),
  }),
});
export type CreativeEvaluationInput = z.infer<typeof creativeEvaluationInputSchema>;

/** Which platform format applies to a content type (D6). */
export function expectedFormatKey(contentTypeKey: string, medium: string): string {
  if (contentTypeKey === "thumbnail") return "thumbnail";
  if (contentTypeKey === "story_cut" || medium === "story") return "story";
  if (medium === "video") return "reel";
  if (medium === "carousel") return "carousel";
  return "feed_static";
}
