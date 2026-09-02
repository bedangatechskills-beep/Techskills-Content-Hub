// Deterministic provider for tests and demos. Applies the same rules the
// prompt asks of the real model, with regexes instead of judgement. It exists
// so the gate can be exercised end to end without an API key.
import type { AIProvider, ProviderResult } from "../provider.ts";
import {
  SCRIPT_CATEGORIES,
  scriptEvaluationSchema,
  type HardFlag,
  type ScriptEvaluation,
  type ScriptEvaluationInput,
} from "../schemas.ts";

const TYPOS: Record<string, string> = {
  recieve: "receive",
  teh: "the",
  guarenteed: "guaranteed",
  guarentee: "guarantee",
  seperate: "separate",
  definately: "definitely",
  occured: "occurred",
  untill: "until",
  carrer: "career",
  oppurtunity: "opportunity",
  sucess: "success",
  begining: "beginning",
  acheive: "achieve",
};

const DEVANAGARI = /[ऀ-ॿ]+/g;
const ROMANISED_NEPALI =
  /\b(namaste|tapai|tapaiko|hamro|hami|garnuhos|garnu|dhanyabad|ramro|kasari|sikaun|sikaunu|aaja|bhai|didi|dai|hunuhuncha|cha|chha|ho)\b/gi;
const OUTCOME_CLAIM =
  /\b(guaranteed?\s+(job|placement|employment|salary)|100%\s*(job|placement)|hundreds?\s+(of\s+)?(students?\s+)?(landed|got|secured)|\$\s?\d{2,3}[,.]?\d{3}|AUD\s?\d{2,3}[,.]?\d{3}|\d{2,3}k\s+(salary|package|per\s+year))/i;
const VISA_ADVICE =
  /\b(you\s+should\s+apply\s+for\s+(a\s+)?(\d{3}\s+)?visa|your\s+visa|apply\s+for\s+(the\s+)?\d{3}\s+visa|PR\s+pathway\s+for\s+you)\b/i;
const MARKET_CLAIM =
  /\b(\d{1,3}%\s+of\s+(employers|companies|graduates|students)|job\s+market\s+(grew|is\s+growing|demand)|shortage\s+of\s+\d)/i;
const SOURCE =
  /\b(according\s+to|source:|\(source|reported\s+by|per\s+the|seek|linkedin\s+data|abs\b|jobs\s+and\s+skills\s+australia|labour\s+market\s+insights)\b/i;
const ACTIVE_IT_HIDDEN =
  /\b(a\s+(leading|top|local)\s+(it\s+)?company\s+called\s+active\s+it|active\s+it,?\s+an\s+independent|independent\s+employer\s+active\s+it)\b/i;
const ACTIVE_IT = /active\s+it/i;
const ACTIVE_IT_OPEN =
  /\b(our\s+sister\s+company|sister\s+company|part\s+of\s+the\s+techskills\s+group|our\s+partner\s+company)\b/i;
const CTA_WORDS =
  /\b(dm\s+us|message\s+us|call\s+us|call\s+now|book\s+(a|your)\s+(free\s+)?(career\s+)?(consultation|call|seat|spot)|consultation|enrol|enroll|register|sign\s+up|visit\s+(us|our)|link\s+in\s+bio|apply\s+now|join\s+(us|the)|learn\s+more|comment\s+below|follow\s+us)\b/i;

function clamp(n: number) {
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/[a-z']+/g) ?? [];
}

export class MockProvider implements AIProvider {
  readonly name = "mock";
  readonly model = "mock-rules-v1";

  async evaluateScript(input: ScriptEvaluationInput): Promise<ProviderResult> {
    const script = input.script;
    const lower = script.toLowerCase();
    const flags: HardFlag[] = [];

    // Spelling (English only, word list)
    for (const w of new Set(wordsOf(script))) {
      if (TYPOS[w]) {
        flags.push({
          key: "spelling_grammar_en",
          severity: "medium",
          excerpt: w,
          fix: `Spell it "${TYPOS[w]}".`,
          needs_human: false,
        });
      }
    }

    // Nepali text
    const dev = script.match(DEVANAGARI);
    const rom = script.match(ROMANISED_NEPALI);
    const nepaliExcerpt = dev?.[0] ?? rom?.[0];
    if (nepaliExcerpt) {
      if (input.content.region_code === "AU") {
        flags.push({
          key: "wrong_region_language",
          severity: "high",
          excerpt: nepaliExcerpt,
          fix: "AU assets are English only. Remove the Nepali text or move this piece to the NP region.",
          needs_human: false,
        });
      } else {
        flags.push({
          key: "nepali_verify",
          severity: "medium",
          excerpt: nepaliExcerpt,
          fix: "Have a Nepali speaker verify this line.",
          needs_human: true,
        });
      }
    }

    // Outcome / salary claims
    const claim = script.match(OUTCOME_CLAIM);
    if (claim) {
      flags.push({
        key: "outcome_or_salary_claim",
        severity: "high",
        excerpt: claim[0],
        fix: "Remove the guarantee or figure, or attribute a verifiable, dated source and soften to what TechSkills actually provides (portfolio, interview preparation, career support).",
        needs_human: false,
      });
    }

    // Visa advice
    const visa = script.match(VISA_ADVICE);
    if (visa) {
      flags.push({
        key: "visa_advice",
        severity: "high",
        excerpt: visa[0],
        fix: "Report what changed and link the official source. Never advise an individual on their visa.",
        needs_human: false,
      });
    }

    // Market claim without source
    const market = script.match(MARKET_CLAIM);
    if (market && !SOURCE.test(script)) {
      flags.push({
        key: "missing_source",
        severity: "medium",
        excerpt: market[0],
        fix: "Name the source and year for this claim, e.g. Jobs and Skills Australia 2026.",
        needs_human: false,
      });
    }

    // Active IT framing
    if (ACTIVE_IT.test(script) && (ACTIVE_IT_HIDDEN.test(script) || !ACTIVE_IT_OPEN.test(script))) {
      const m = script.match(ACTIVE_IT_HIDDEN) ?? script.match(ACTIVE_IT);
      flags.push({
        key: "active_it_not_transparent",
        severity: "medium",
        excerpt: m?.[0] ?? "Active IT",
        fix: 'Name Active IT openly as the TechSkills sister company, e.g. "our sister company Active IT".',
        needs_human: false,
      });
    }

    // Retired handles
    for (const h of input.reference.retired_handles) {
      if (h && lower.includes(h.toLowerCase())) {
        flags.push({
          key: "retired_handle",
          severity: "high",
          excerpt: h,
          fix:
            `Replace with the active handle ${input.reference.active_handles.find((a) => a.platform.toLowerCase().includes("instagram"))?.handle ?? ""}`.trim() +
            ".",
          needs_human: false,
        });
      }
    }

    // CTA
    const recordCta = input.content.cta?.trim();
    const hasCtaWords = CTA_WORDS.test(script);
    if (recordCta) {
      const ctaKey = recordCta
        .toLowerCase()
        .replace(/[^a-z ]/g, "")
        .split(" ")
        .filter((w) => w.length > 3);
      const matches = ctaKey.length === 0 || ctaKey.some((w) => lower.includes(w));
      if (!matches && !hasCtaWords) {
        flags.push({
          key: "cta_missing_or_mismatch",
          severity: "medium",
          excerpt: script.split("\n").filter(Boolean).pop() ?? "",
          fix: `End with the CTA on the record: "${recordCta}".`,
          needs_human: false,
        });
      }
    } else if (!hasCtaWords) {
      flags.push({
        key: "cta_missing_or_mismatch",
        severity: "medium",
        excerpt: script.split("\n").filter(Boolean).pop() ?? "",
        fix: "Add a clear call to action: DM us, book a free career consultation, or enrol.",
        needs_human: false,
      });
    }

    // Scores (deterministic heuristics)
    const words = wordsOf(script).length;
    const firstLine = script.split(/\n|\. /)[0] ?? "";
    const hookScore = clamp(
      5 +
        (/\?|what if|imagine|stop|secret|nobody|first job|before you/i.test(firstLine) ? 3 : 0) +
        (firstLine.length < 90 ? 1 : 0),
    );
    const diffs = input.content.differentiators.map((d) =>
      d
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length > 4),
    );
    const diffHits = diffs.filter((ws) => ws.some((w) => lower.includes(w))).length;
    const diffScore = clamp(
      input.content.differentiators.length
        ? 4 + (6 * diffHits) / input.content.differentiators.length
        : 5,
    );
    const spelling = flags.filter((f) => f.key === "spelling_grammar_en").length;
    const wordingScore = clamp(9 - spelling * 1.5);
    const ctaScore = clamp(flags.some((f) => f.key === "cta_missing_or_mismatch") ? 3 : 8.5);
    const shortForm = clamp(words <= 120 ? 9 : words <= 220 ? 7 : 4.5);
    const clarity = clamp(words < 12 ? 4 : 8);
    const relevance = clamp(
      input.content.target_audience &&
        lower.includes(input.content.target_audience.toLowerCase().split(" ")[0] ?? "")
        ? 8.5
        : 7,
    );
    const premium = clamp(flags.some((f) => f.key === "outcome_or_salary_claim") ? 5 : 7.5);
    const high = flags.filter((f) => f.severity === "high").length;
    const overallQuality = clamp(
      (hookScore +
        clarity +
        relevance +
        diffScore +
        premium +
        wordingScore +
        ctaScore +
        shortForm) /
        8 -
        high * 1.5,
    );

    const category_scores = Object.fromEntries(
      SCRIPT_CATEGORIES.map((k) => [
        k,
        {
          hook_attention: hookScore,
          message_clarity: clarity,
          audience_relevance: relevance,
          techskills_differentiation: diffScore,
          premium_positioning: premium,
          professional_wording: wordingScore,
          cta: ctaScore,
          short_form_suitability: shortForm,
          overall_quality: overallQuality,
        }[k],
      ]),
    ) as ScriptEvaluation["category_scores"];

    const recommendations: ScriptEvaluation["recommendations"] = [];
    if (diffScore < 7)
      recommendations.push({
        category: "techskills_differentiation",
        issue: "TechSkills differentiation is weak.",
        suggested_fix:
          "Add one clear Job Ready Program benefit such as portfolio development, communication coaching or career support.",
      });
    if (hookScore < 7)
      recommendations.push({
        category: "hook_attention",
        issue: "The opening line does not stop the scroll.",
        suggested_fix: "Open with a question or a surprising outcome in under 12 words.",
      });
    if (ctaScore < 7)
      recommendations.push({
        category: "cta",
        issue: "The call to action is missing or vague.",
        suggested_fix: "Close with one specific action: DM us, book a free consultation, or enrol.",
      });
    if (recommendations.length < 3 && shortForm < 7)
      recommendations.push({
        category: "short_form_suitability",
        issue: "Too long for a short-form post.",
        suggested_fix: "Cut to under 120 words and keep one idea per sentence.",
      });

    const overall = overallQuality;
    const verdict: ScriptEvaluation["verdict"] =
      flags.length === 0 && overall >= 7
        ? "ready"
        : high > 0 || overall < 5
          ? "significant_issues"
          : "minor_issues";

    const evaluation: ScriptEvaluation = scriptEvaluationSchema.parse({
      category_scores,
      overall_score: overall,
      recommendations: recommendations.slice(0, 3),
      hard_flags: flags,
      verdict,
      summary:
        flags.length === 0
          ? `No hard flags. Overall ${overall}/10.`
          : `${flags.length} hard flag${flags.length === 1 ? "" : "s"} (${[...new Set(flags.map((f) => f.key))].join(", ")}). Overall ${overall}/10.`,
    });

    return { evaluation, model: this.model, raw: { provider: "mock", rules: "v1" } };
  }
}
