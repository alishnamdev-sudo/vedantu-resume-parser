/**
 * Gemini token usage and cost per call, for the AnalysisRun log.
 *
 * USD per 1M tokens, paid tier, from https://ai.google.dev/gemini-api/docs/pricing
 * (page dated 2026-09-24). Output price covers thinking tokens. A model missing here gets
 * no cost, but its tokens are still stored so cost can be backfilled once it's added.
 */
const PRICES: Record<string, { input: number; cachedInput: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.3, cachedInput: 0.03, output: 2.5 },
  "gemini-2.5-flash-lite": { input: 0.1, cachedInput: 0.01, output: 0.4 },
  // <=200k-token prompt tier; a rubric plus one CV is far below that.
  "gemini-2.5-pro": { input: 1.25, cachedInput: 0.125, output: 10 },
  "gemini-3.5-flash": { input: 1.5, cachedInput: 0.15, output: 9 },
};

export type TokenUsage = {
  inputTokens: number;
  /** Subset of inputTokens served from Gemini's implicit cache, billed at the cached rate. */
  cachedInputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
};

/**
 * Reads Gemini's `usageMetadata`. The installed SDK's type only declares the prompt/candidate
 * counts, but the API also returns thinking and cached counts, which matter for cost.
 */
export function readUsage(meta: unknown): TokenUsage | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" ? v : 0);
  return {
    inputTokens: n(m.promptTokenCount),
    cachedInputTokens: n(m.cachedContentTokenCount),
    outputTokens: n(m.candidatesTokenCount),
    thinkingTokens: n(m.thoughtsTokenCount),
  };
}

export function costUsd(model: string, usage: TokenUsage): number | null {
  const price = PRICES[model];
  if (!price) return null;
  const uncachedInput = usage.inputTokens - usage.cachedInputTokens;
  return (
    (uncachedInput * price.input +
      usage.cachedInputTokens * price.cachedInput +
      (usage.outputTokens + usage.thinkingTokens) * price.output) /
    1_000_000
  );
}
