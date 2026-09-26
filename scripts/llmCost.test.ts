import assert from "node:assert/strict";
import { costUsd, readUsage } from "../src/lib/llmCost.js";

const close = (a: number | null, b: number) => assert.ok(a !== null && Math.abs(a - b) < 1e-12, `${a} != ${b}`);

// Thinking tokens bill at the output rate; cached input at the cached rate.
const usage = readUsage({
  promptTokenCount: 5000,
  cachedContentTokenCount: 2000,
  candidatesTokenCount: 200,
  thoughtsTokenCount: 800,
  totalTokenCount: 6000,
});
assert.deepEqual(usage, { inputTokens: 5000, cachedInputTokens: 2000, outputTokens: 200, thinkingTokens: 800 });
// 2.5 Flash: 3000*0.30 + 2000*0.03 + 1000*2.50 = 900 + 60 + 2500 = 3460 per 1M
close(costUsd("gemini-2.5-flash", usage!), 0.00346);
// 3.5 Flash: 3000*1.50 + 2000*0.15 + 1000*9.00 = 4500 + 300 + 9000 = 13800 per 1M
close(costUsd("gemini-3.5-flash", usage!), 0.0138);

// Missing optional counts read as zero; unknown models get no cost rather than a guess.
assert.deepEqual(readUsage({ promptTokenCount: 10, candidatesTokenCount: 5 }), {
  inputTokens: 10,
  cachedInputTokens: 0,
  outputTokens: 5,
  thinkingTokens: 0,
});
assert.equal(readUsage(undefined), null);
assert.equal(costUsd("some-future-model", usage!), null);

console.log("llmCost: all checks passed");
