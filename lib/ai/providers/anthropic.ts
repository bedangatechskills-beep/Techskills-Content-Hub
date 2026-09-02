// Anthropic adapter. Uses structured outputs so the answer always matches the
// schema; the strict Zod schema is applied again before storage.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { AIProvider, ProviderResult, ScriptPrompt } from "../provider.ts";
import {
  scriptEvaluationOutputSchema,
  scriptEvaluationSchema,
  type ScriptEvaluationInput,
} from "../schemas.ts";

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model: string;
  private client: Anthropic;

  constructor(apiKey: string, model?: string) {
    this.model = model ?? DEFAULT_ANTHROPIC_MODEL;
    // 90 s: a script evaluation is short; the Edge Function budget is 150 s.
    this.client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 2 });
  }

  async evaluateScript(
    _input: ScriptEvaluationInput,
    prompt: ScriptPrompt,
  ): Promise<ProviderResult> {
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 4000,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
      output_config: { format: zodOutputFormat(scriptEvaluationOutputSchema), effort: "medium" },
    });

    if (response.stop_reason === "refusal") {
      throw new Error("The model declined to evaluate this script.");
    }
    if (!response.parsed_output) {
      throw new Error("The model returned an answer that did not match the expected shape.");
    }

    const evaluation = scriptEvaluationSchema.parse({
      ...response.parsed_output,
      recommendations: response.parsed_output.recommendations.slice(0, 3),
    });

    return {
      evaluation,
      model: response.model,
      raw: { id: response.id, usage: response.usage, stop_reason: response.stop_reason },
    };
  }
}
