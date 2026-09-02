// Swappable AI provider (D2). The app and the Edge Function pick an adapter by
// the AI_PROVIDER environment variable. Prompts and schemas live in the repo.
import type { ScriptEvaluation, ScriptEvaluationInput } from "./schemas.ts";

export interface ScriptPrompt {
  system: string;
  user: string;
}

export interface ProviderResult {
  evaluation: ScriptEvaluation;
  model: string;
  raw: unknown;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  evaluateScript(input: ScriptEvaluationInput, prompt: ScriptPrompt): Promise<ProviderResult>;
}

export type ProviderName = "mock" | "anthropic";

export interface ProviderEnv {
  AI_PROVIDER?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
}

export class ProviderConfigError extends Error {}

export async function getProvider(env: ProviderEnv): Promise<AIProvider> {
  const name = (env.AI_PROVIDER ?? "mock").toLowerCase() as ProviderName;
  switch (name) {
    case "mock": {
      const { MockProvider } = await import("./providers/mock.ts");
      return new MockProvider();
    }
    case "anthropic": {
      if (!env.ANTHROPIC_API_KEY) throw new ProviderConfigError("ANTHROPIC_API_KEY is not set");
      const { AnthropicProvider } = await import("./providers/anthropic.ts");
      return new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);
    }
    default:
      throw new ProviderConfigError(`Unknown AI_PROVIDER "${env.AI_PROVIDER}"`);
  }
}
