import { describe, expect, it } from "vitest";
import { MockProvider } from "@/lib/ai/providers/mock";
import { buildScriptPrompt, runScriptEvaluation, scriptInputHash } from "@/lib/ai/evaluate-script";
import { getProvider, ProviderConfigError } from "@/lib/ai/provider";
import { scriptEvaluationSchema, type ScriptEvaluationInput } from "@/lib/ai/schemas";

function input(
  script: string,
  overrides: Partial<ScriptEvaluationInput["content"]> = {},
): ScriptEvaluationInput {
  return {
    script,
    script_shape: "spoken",
    today: "2026-09-02",
    content: {
      content_id: "TS-NP-2609-001",
      title: "Kathmandu intake reel",
      region_code: "NP",
      campus_name: "Kathmandu",
      content_type: "Reel / short vertical video",
      platforms: ["Instagram"],
      target_audience: "Final-year IT students in Kathmandu",
      objective: "Lead Generation",
      hook: "What if your first job started before graduation?",
      core_message: "Real projects and career support",
      audience_takeaway: "TechSkills gets you job ready",
      cta: "Book a free career consultation",
      differentiators: ["Portfolio development", "Interview preparation"],
      target_publish_date: "2026-09-15",
      ...overrides,
    },
    reference: {
      active_handles: [{ platform: "Instagram", handle: "@techskills.nepal" }],
      retired_handles: ["@techskillsitcareer"],
      campuses: [{ name: "Kathmandu", phone: null, address: null }],
      taglines: ["Your IT Career Begins Here"],
    },
  };
}

const CLEAN = `What if your first job started before graduation?
At TechSkills Kathmandu you build a real portfolio and practise interview preparation with mentors.
Book a free career consultation today.`;

describe("mock provider golden cases", () => {
  const provider = new MockProvider();

  it("passes a clean script with no hard flags", async () => {
    const run = await runScriptEvaluation(input(CLEAN), provider);
    expect(run.evaluation.hard_flags).toEqual([]);
    expect(run.evaluation.verdict).toBe("ready");
    expect(run.evaluation.overall_score).toBeGreaterThanOrEqual(7);
    expect(run.prompt_version).toBe("script.v1");
    expect(run.provider).toBe("mock");
  });

  it("flags an English typo with the fix", async () => {
    const run = await runScriptEvaluation(
      input(CLEAN.replace("receive", "recieve") + "\nYou will recieve a certificate."),
      provider,
    );
    const f = run.evaluation.hard_flags.find((x) => x.key === "spelling_grammar_en");
    expect(f?.excerpt).toBe("recieve");
    expect(f?.fix).toContain("receive");
    expect(f?.needs_human).toBe(false);
  });

  it("flags a guaranteed job claim as high severity", async () => {
    const run = await runScriptEvaluation(
      input(CLEAN + "\nWe offer a guaranteed job after the course."),
      provider,
    );
    const f = run.evaluation.hard_flags.find((x) => x.key === "outcome_or_salary_claim");
    expect(f?.severity).toBe("high");
    expect(run.evaluation.verdict).toBe("significant_issues");
  });

  it("flags the retired handle", async () => {
    const run = await runScriptEvaluation(
      input(CLEAN + "\nFollow @techskillsitcareer for more."),
      provider,
    );
    expect(run.evaluation.hard_flags.map((f) => f.key)).toContain("retired_handle");
  });

  it("flags Nepali on an AU asset as wrong-region language", async () => {
    const run = await runScriptEvaluation(
      input(CLEAN + "\nनमस्ते साथीहरू", { region_code: "AU", campus_name: "Perth" }),
      provider,
    );
    const f = run.evaluation.hard_flags.find((x) => x.key === "wrong_region_language");
    expect(f?.severity).toBe("high");
    expect(run.evaluation.hard_flags.map((x) => x.key)).not.toContain("nepali_verify");
  });

  it("flags Nepali on an NP asset for human verification, never a correction", async () => {
    const run = await runScriptEvaluation(input(CLEAN + "\nनमस्ते साथीहरू"), provider);
    const f = run.evaluation.hard_flags.find((x) => x.key === "nepali_verify");
    expect(f?.needs_human).toBe(true);
    expect(f?.fix).toMatch(/verify/i);
    expect(run.evaluation.hard_flags.map((x) => x.key)).not.toContain("wrong_region_language");
  });

  it("never flags proper nouns", async () => {
    const run = await runScriptEvaluation(
      input(CLEAN + "\nOur sister company Active IT hires from Kathmandu and Rockdale."),
      provider,
    );
    expect(run.evaluation.hard_flags.map((x) => x.key)).not.toContain("spelling_grammar_en");
    expect(run.evaluation.hard_flags.map((x) => x.key)).not.toContain("active_it_not_transparent");
  });

  it("flags Active IT when not framed as the sister company", async () => {
    const run = await runScriptEvaluation(
      input(CLEAN + "\nGraduates get hired by a leading IT company called Active IT."),
      provider,
    );
    expect(run.evaluation.hard_flags.map((x) => x.key)).toContain("active_it_not_transparent");
  });

  it("flags a missing CTA", async () => {
    const run = await runScriptEvaluation(
      input("What if your first job started before graduation?\nWe teach real skills."),
      provider,
    );
    expect(run.evaluation.hard_flags.map((x) => x.key)).toContain("cta_missing_or_mismatch");
  });

  it("keeps recommendations to three and validates the shape", async () => {
    const run = await runScriptEvaluation(input("hi"), provider);
    expect(run.evaluation.recommendations.length).toBeLessThanOrEqual(3);
    expect(() => scriptEvaluationSchema.parse(run.evaluation)).not.toThrow();
  });
});

describe("prompt assembly and hashing", () => {
  it("injects record and reference data into the user prompt", () => {
    const p = buildScriptPrompt(input(CLEAN));
    expect(p.system).toMatch(/advisory/i);
    expect(p.user).toContain("Region: NP");
    expect(p.user).toContain("@techskillsitcareer");
    expect(p.user).toContain("Book a free career consultation");
    expect(p.user).toContain("<script>");
  });

  it("hash is stable for identical input and ignores today's date", async () => {
    const a = await scriptInputHash(input(CLEAN), "m");
    const b = await scriptInputHash({ ...input(CLEAN), today: "2030-01-01" }, "m");
    const c = await scriptInputHash(input(CLEAN + " changed"), "m");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("provider selection", () => {
  it("defaults to mock", async () => {
    expect((await getProvider({})).name).toBe("mock");
  });
  it("requires a key for anthropic", async () => {
    await expect(getProvider({ AI_PROVIDER: "anthropic" })).rejects.toBeInstanceOf(
      ProviderConfigError,
    );
  });
  it("rejects unknown providers", async () => {
    await expect(getProvider({ AI_PROVIDER: "nope" })).rejects.toBeInstanceOf(ProviderConfigError);
  });
});
