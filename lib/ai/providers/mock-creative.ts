// Deterministic creative evaluation for tests and demos. It cannot see
// pixels, so it reads what it can: dimensions, metadata, the approved copy,
// and "mock hints" in the uploader's note, e.g. "mock: typo Kathamndu; retired handle; ai human".
import type { CreativeProviderResult } from "../provider.ts";
import {
  CREATIVE_CATEGORIES,
  creativeEvaluationSchema,
  type CreativeEvaluation,
  type CreativeEvaluationInput,
  type CreativeFlag,
} from "../creative-schemas.ts";

const TYPOS: Record<string, string> = {
  kathamndu: "Kathmandu",
  recieve: "receive",
  guarenteed: "guaranteed",
  carrer: "career",
  oppurtunity: "opportunity",
  sucess: "success",
  definately: "definitely",
  seperate: "separate",
  begining: "beginning",
  acheive: "achieve",
};
const DEVANAGARI = /[ऀ-ॿ]+/;
const CTA_WORDS =
  /\b(dm\s+us|message\s+us|call\s+(us|now)|book\s+(a|your)|consultation|enrol|enroll|register|sign\s+up|visit|link\s+in\s+bio|apply\s+now|learn\s+more)\b/i;

function clamp(n: number) {
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

function hintsOf(note: string | null): string[] {
  if (!note) return [];
  const m = note.match(/mock:\s*(.+)$/i);
  if (!m) return [];
  return m[1]
    .split(/;|,/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function mockEvaluateCreative(
  input: CreativeEvaluationInput,
  model: string,
): Promise<CreativeProviderResult> {
  const flags: CreativeFlag[] = [];
  const hints = hintsOf(input.creative.note);
  const observed: string[] = [];
  const copy = input.approved_copy ?? "";
  const region = input.content.region_code;

  // Text the "model" can read: the approved copy plus anything the hints say is on the asset.
  const hintTexts = hints.map((h) => h.replace(/^(typo|text|handle|says)\s+/i, ""));
  const seen = [copy, ...hintTexts].join("\n");
  observed.push(seen.trim());

  // Spelling from hint text and copy
  for (const w of new Set(seen.toLowerCase().match(/[a-z']+/g) ?? [])) {
    if (TYPOS[w])
      flags.push({
        key: "spelling",
        severity: "high",
        excerpt: w,
        fix: `Spell it "${TYPOS[w]}".`,
        needs_human: false,
      });
  }
  // Retired handle
  for (const h of input.reference.retired_handles) {
    if (
      h &&
      (seen.toLowerCase().includes(h.toLowerCase()) || hints.some((x) => x.includes("retired")))
    ) {
      const active = input.reference.active_handles[0]?.handle ?? "";
      flags.push({
        key: "contact_wrong",
        severity: "high",
        excerpt: h,
        fix: `Replace the retired handle with ${active || "the active handle"}.`,
        needs_human: false,
      });
      break;
    }
  }
  // Nepali
  const nepali = DEVANAGARI.test(seen) || hints.some((x) => x.includes("nepali"));
  if (nepali) {
    if (region === "AU") {
      flags.push({
        key: "wrong_region_language",
        severity: "high",
        excerpt: "Nepali text on the asset",
        fix: "AU assets are English only. Remove the Nepali text or move the piece to NP.",
        needs_human: false,
      });
    } else {
      flags.push({
        key: "nepali_verify",
        severity: "medium",
        excerpt: "Nepali line on the asset",
        fix: "Have a Nepali speaker verify this line.",
        needs_human: true,
      });
    }
  }
  // AI humans and artifacts
  const aiHuman = hints.some((x) => /ai (human|person|face|stock)/.test(x));
  if (aiHuman) {
    if (input.content.pillar_human_only) {
      flags.push({
        key: "synthetic_human_on_proof",
        severity: "critical",
        excerpt: "Synthetic person on a real-student story",
        fix: "Use the real student or graduate. Synthetic humans are banned on Student Success / Journey / Creator content, including thumbnails.",
        needs_human: false,
      });
    }
    flags.push({
      key: "ai_disclosure_required",
      severity: "medium",
      excerpt: "AI-generated imagery present",
      fix: "Publisher must enable the platform's AI-content disclosure at publish.",
      needs_human: false,
    });
  }
  if (hints.some((x) => /(six fingers|artifact|artefact|malformed)/.test(x))) {
    flags.push({
      key: "ai_artifact",
      severity: "high",
      excerpt: "Hands / anatomy artifact",
      fix: "Regenerate or retouch the image; check hands, fingers and faces.",
      needs_human: false,
    });
  }
  if (hints.some((x) => /(awkward|pose|closed eyes|bad crop)/.test(x))) {
    flags.push({
      key: "pose_or_crop",
      severity: "medium",
      excerpt: "Awkward pose / crop",
      fix: "Choose a photo with a natural posture and a clean crop.",
      needs_human: false,
    });
  }
  // Countdown
  if (hints.some((x) => /countdown|days to go/.test(x)) && input.content.target_publish_date) {
    flags.push({
      key: "countdown_wrong",
      severity: "high",
      excerpt: "Countdown on the asset",
      fix: `Recalculate against the publish date ${input.content.target_publish_date} and today ${input.today}.`,
      needs_human: false,
    });
  }
  // CTA
  const ctaPresent = CTA_WORDS.test(seen) || hints.some((x) => x.includes("cta"));
  if (!ctaPresent && !copy) {
    flags.push({
      key: "cta_missing",
      severity: "medium",
      excerpt: "No call to action visible",
      fix: "Add a clear CTA: DM us, book a free career consultation, or enrol.",
      needs_human: false,
    });
  }
  // Format / safe zone (D6) — from real dimensions
  const fmt = input.reference.expected_format;
  const w = input.creative.width;
  const h = input.creative.height;
  if (fmt && w && h && input.creative.kind !== "video") {
    const expected = fmt.width / fmt.height;
    const actual = w / h;
    if (Math.abs(actual - expected) > 0.02) {
      flags.push({
        key: "format_safe_zone",
        severity: "medium",
        excerpt: `${w} × ${h} (ratio ${actual.toFixed(2)}), expected ${fmt.ratio} (${fmt.width} × ${fmt.height})`,
        fix: `Design mobile-first at ${fmt.ratio} (${fmt.width} × ${fmt.height}), keep all critical content inside a ${fmt.safe_margin_pct}% internal margin, one message per creative; move detail into carousel slides.`,
        needs_human: false,
      });
    }
  }
  if (hints.some((x) => /(edge text|safe zone|cut off)/.test(x))) {
    flags.push({
      key: "format_safe_zone",
      severity: "medium",
      excerpt: "Text near the edge",
      fix: `Keep all critical text inside the ${fmt?.safe_margin_pct ?? 10}% safe margin; Facebook's feed viewer crops the edges.`,
      needs_human: false,
    });
  }
  if (hints.some((x) => /(wall of text|too much text|dense)/.test(x))) {
    flags.push({
      key: "text_density",
      severity: "medium",
      excerpt: "Dense infographic",
      fix: "One clear message per creative; move the detail into carousel slides.",
      needs_human: false,
    });
  }
  // Video checks
  if (input.creative.kind === "video" && w && h && Math.abs(w / h - 9 / 16) > 0.02) {
    flags.push({
      key: "not_916",
      severity: "high",
      excerpt: `${w} × ${h}`,
      fix: "Export a 9:16 master (1080 × 1920).",
      needs_human: false,
    });
  }

  const high = flags.filter((f) => f.severity === "high" || f.severity === "critical").length;
  const base = input.creative.image_attached ? 8 : 6.5;
  const scores = Object.fromEntries(
    CREATIVE_CATEGORIES.map((k) => {
      let s = base;
      if (k === "text_density" && flags.some((f) => f.key === "text_density")) s = 4;
      if (
        k === "mobile_readability" &&
        flags.some((f) => f.key === "format_safe_zone" || f.key === "phone_readability")
      )
        s = 5;
      if (k === "cta_visibility" && flags.some((f) => f.key === "cta_missing")) s = 3;
      if (k === "brand_consistency" && flags.some((f) => f.key === "contact_wrong")) s = 4;
      if (k === "overall_quality") s = clamp(base - high * 1.5 - (flags.length - high) * 0.5);
      return [k, clamp(s)];
    }),
  ) as CreativeEvaluation["category_scores"];
  const overall = scores.overall_quality;

  const recommendations: CreativeEvaluation["recommendations"] = [];
  if (flags.some((f) => f.key === "text_density" || f.key === "format_safe_zone"))
    recommendations.push({
      category: "text_density",
      issue: "Too much for one feed creative.",
      suggested_fix: "One message per creative at 4:5; carousel slides for the detail.",
    });
  if (flags.some((f) => f.key === "cta_missing"))
    recommendations.push({
      category: "cta_visibility",
      issue: "CTA is not visible.",
      suggested_fix: "Add one clear action in the bottom third, inside the safe zone.",
    });
  if (
    recommendations.length < 3 &&
    input.content.differentiators.length &&
    !input.content.differentiators.some((d) =>
      copy.toLowerCase().includes(d.toLowerCase().split(" ")[0]),
    )
  )
    recommendations.push({
      category: "brand_differentiation",
      issue: "Chosen differentiators do not appear.",
      suggested_fix: `Show one of: ${input.content.differentiators.slice(0, 2).join(", ")}.`,
    });

  const evaluation = creativeEvaluationSchema.parse({
    category_scores: scores,
    overall_score: overall,
    recommendations: recommendations.slice(0, 3),
    hard_flags: flags,
    group2_status: input.reference.brand_facts_configured ? "checked" : "not_configured",
    verdict:
      flags.length > 0
        ? "significant_issues"
        : overall >= 7
          ? "ready_for_dm_review"
          : "improve_before_review",
    summary:
      flags.length === 0
        ? `No hard flags. Overall ${overall}/10.`
        : `${flags.length} hard flag${flags.length === 1 ? "" : "s"} (${[...new Set(flags.map((f) => f.key))].join(", ")}). Overall ${overall}/10.`,
    observed_text: observed.join("\n"),
  });
  return { evaluation, model, raw: { provider: "mock", rules: "creative-v1", hints } };
}
