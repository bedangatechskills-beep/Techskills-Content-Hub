import { describe, expect, it } from "vitest";
import { MockProvider } from "@/lib/ai/providers/mock";
import { buildCreativePrompt, runCreativeEvaluation } from "@/lib/ai/evaluate-creative";
import {
  creativeEvaluationSchema,
  expectedFormatKey,
  type CreativeEvaluationInput,
} from "@/lib/ai/creative-schemas";

function input(
  over: {
    note?: string;
    width?: number;
    height?: number;
    region?: "AU" | "NP";
    humanOnly?: boolean;
    kind?: "image" | "video";
    copy?: string | null;
  } = {},
): CreativeEvaluationInput {
  return {
    today: "2026-09-03",
    creative: {
      version_no: 1,
      kind: over.kind ?? "image",
      file_name: "poster.png",
      mime: "image/png",
      width: over.width ?? 1080,
      height: over.height ?? 1350,
      duration_s: null,
      note: over.note ?? null,
      image_attached: true,
    },
    approved_copy:
      over.copy === undefined
        ? "What if your first job started before graduation?\nBook a free career consultation today."
        : over.copy,
    content: {
      content_id: "TS-NP-2609-001",
      title: "Kathmandu intake poster",
      region_code: over.region ?? "NP",
      campus_name: "Kathmandu",
      content_type: "Admission poster",
      content_type_key: "admission_poster",
      medium: "static",
      platforms: ["Facebook", "Instagram"],
      objective: "Lead Generation",
      pillar: over.humanOnly ? "Student Success" : "Program Promotion",
      pillar_human_only: !!over.humanOnly,
      hook: "What if your first job started before graduation?",
      core_message: "Real projects and career support",
      cta: "Book a free career consultation",
      target_publish_date: "2026-09-15",
      differentiators: ["Portfolio development"],
      is_crosspost_to_au: false,
    },
    reference: {
      active_handles: [{ platform: "Instagram", handle: "@techskills.nepal" }],
      retired_handles: ["@techskillsitcareer"],
      campuses: [{ name: "Kathmandu", phone: null, address: null }],
      taglines: ["Your IT Career Begins Here"],
      expected_format: { ratio: "4:5", width: 1080, height: 1350, safe_margin_pct: 10 },
      brand_facts_configured: false,
      palette: [],
      fonts: [],
    },
  };
}

const provider = new MockProvider();

describe("mock creative gate golden cases", () => {
  it("clean 4:5 poster passes with no flags and Group 2 not configured", async () => {
    const run = await runCreativeEvaluation(input(), provider, []);
    expect(run.evaluation.hard_flags).toEqual([]);
    expect(run.evaluation.verdict).toBe("ready_for_dm_review");
    expect(run.evaluation.group2_status).toBe("not_configured");
    expect(run.prompt_version).toBe("creative.v1");
  });

  it("flags a typo and the retired handle from the demo poster", async () => {
    const run = await runCreativeEvaluation(
      input({ note: "mock: typo Kathamndu; handle @techskillsitcareer" }),
      provider,
      [],
    );
    const keys = run.evaluation.hard_flags.map((f) => f.key);
    expect(keys).toContain("spelling");
    expect(keys).toContain("contact_wrong");
    expect(run.evaluation.verdict).toBe("significant_issues");
    expect(run.evaluation.hard_flags.find((f) => f.key === "spelling")?.fix).toContain("Kathmandu");
  });

  it("flags a wide infographic as a format / safe-zone defect (D6)", async () => {
    const run = await runCreativeEvaluation(input({ width: 1920, height: 1080 }), provider, []);
    const f = run.evaluation.hard_flags.find((x) => x.key === "format_safe_zone");
    expect(f).toBeTruthy();
    expect(f?.fix).toMatch(/4:5/);
    expect(f?.fix).toMatch(/carousel/i);
  });

  it("does not raise the format flag for a correct 4:5 asset", async () => {
    const run = await runCreativeEvaluation(input({ width: 1080, height: 1350 }), provider, []);
    expect(run.evaluation.hard_flags.map((f) => f.key)).not.toContain("format_safe_zone");
  });

  it("flags an AI human on a real-student story as critical and requires disclosure", async () => {
    const run = await runCreativeEvaluation(
      input({ note: "mock: ai human", humanOnly: true }),
      provider,
      [],
    );
    const keys = run.evaluation.hard_flags.map((f) => f.key);
    expect(keys).toContain("synthetic_human_on_proof");
    expect(keys).toContain("ai_disclosure_required");
    expect(
      run.evaluation.hard_flags.find((f) => f.key === "synthetic_human_on_proof")?.severity,
    ).toBe("critical");
  });

  it("permits AI stock humans on promo but still requires disclosure", async () => {
    const run = await runCreativeEvaluation(input({ note: "mock: ai stock person" }), provider, []);
    const keys = run.evaluation.hard_flags.map((f) => f.key);
    expect(keys).toContain("ai_disclosure_required");
    expect(keys).not.toContain("synthetic_human_on_proof");
  });

  it("flags six fingers as an AI artifact", async () => {
    const run = await runCreativeEvaluation(input({ note: "mock: six fingers" }), provider, []);
    expect(run.evaluation.hard_flags.map((f) => f.key)).toContain("ai_artifact");
  });

  it("Nepali on AU is wrong-region; on NP it is a human verification", async () => {
    const au = await runCreativeEvaluation(
      input({ note: "mock: nepali line", region: "AU" }),
      provider,
      [],
    );
    const np = await runCreativeEvaluation(input({ note: "mock: nepali line" }), provider, []);
    expect(au.evaluation.hard_flags.map((f) => f.key)).toContain("wrong_region_language");
    expect(np.evaluation.hard_flags.find((f) => f.key === "nepali_verify")?.needs_human).toBe(true);
  });

  it("never flags proper nouns", async () => {
    const run = await runCreativeEvaluation(
      input({ note: "mock: text Kathmandu Active IT TechSkills Rockdale" }),
      provider,
      [],
    );
    expect(run.evaluation.hard_flags.map((f) => f.key)).not.toContain("spelling");
  });

  it("video that is not 9:16 is flagged", async () => {
    const run = await runCreativeEvaluation(
      input({ kind: "video", width: 1920, height: 1080 }),
      provider,
      [],
    );
    expect(run.evaluation.hard_flags.map((f) => f.key)).toContain("not_916");
  });

  it("validates the shape and caps recommendations", async () => {
    const run = await runCreativeEvaluation(
      input({ note: "mock: wall of text; edge text; ai human", copy: null }),
      provider,
      [],
    );
    expect(() => creativeEvaluationSchema.parse(run.evaluation)).not.toThrow();
    expect(run.evaluation.recommendations.length).toBeLessThanOrEqual(3);
  });
});

describe("creative prompt", () => {
  it("carries the D6 format rule and the record context", () => {
    const p = buildCreativePrompt(input());
    expect(p.system).toMatch(/format_safe_zone/);
    expect(p.system).toMatch(/4:5/);
    expect(p.user).toContain("Expected format for this type: 4:5 (1080 × 1350), safe margin 10%");
    expect(p.user).toContain("@techskillsitcareer");
    expect(p.user).toContain("<copy>");
  });
  it("maps content types to platform formats", () => {
    expect(expectedFormatKey("admission_poster", "static")).toBe("feed_static");
    expect(expectedFormatKey("carousel", "carousel")).toBe("carousel");
    expect(expectedFormatKey("reel", "video")).toBe("reel");
    expect(expectedFormatKey("thumbnail", "thumbnail")).toBe("thumbnail");
    expect(expectedFormatKey("story_cut", "story")).toBe("story");
  });
});
