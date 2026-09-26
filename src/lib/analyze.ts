import { createHash } from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { buildAnalysisPrompt, ProgrammeId } from "./rubric";
import { costUsd, readUsage, TokenUsage } from "./llmCost";

const AnalysisSchema = z.object({
  verdict: z.enum(["GTG", "ON_HOLD", "NOT_CONSIDERED"]),
  fastTrack: z.boolean().default(false),
  matchedProfile: z.string().default(""),
  reason: z.string(),
  flags: z.array(z.string()).default([]),
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1_000;

/** Thrown for problems no amount of retrying will fix (bad config). */
class PermanentAnalysisError extends Error {}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : trimmed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Short hash of the prompt template for a programme (rubric + instructions, with the CV-specific
 * parts blanked). Changes by itself whenever the rubric text is edited, so verdict and cost shifts
 * can be traced to the prompt change that caused them. Per programme, because each has its own rubric.
 */
function promptVersion(programme: ProgrammeId): string {
  const template = buildAnalysisPrompt({ programme, candidateName: "", resumeText: "", subject: "-" });
  return createHash("sha256").update(template).digest("hex").slice(0, 8);
}

export type AnalysisAttempt = {
  model: string;
  promptVersion: string;
  attempt: number;
  status: "OK" | "INVALID_JSON" | "SCHEMA_MISMATCH" | "API_ERROR";
  errorMessage: string | null;
  latencyMs: number;
  usage: TokenUsage | null;
  costUsd: number | null;
  verdict: AnalysisResult["verdict"] | null;
  fastTrack: boolean | null;
};

export async function analyzeResume(
  params: {
    programme: ProgrammeId;
    candidateName: string;
    resumeText: string;
    subject?: string | null;
  },
  /** Called once per Gemini attempt, successful or not. Must not throw. */
  onAttempt?: (attempt: AnalysisAttempt) => void
): Promise<{ result: AnalysisResult; raw: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key-here") {
    throw new PermanentAnalysisError(
      "GEMINI_API_KEY is not configured. Add it to your .env file to enable resume analysis."
    );
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = buildAnalysisPrompt(params);
  const version = promptVersion(params.programme);

  // Both failure modes worth retrying are transient: Gemini rate-limits/5xx, and the
  // occasional response that isn't the JSON we asked for. Same backoff handles both.
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Advanced as the attempt gets further, so a failure is logged with the stage it failed at.
    let status: AnalysisAttempt["status"] = "API_ERROR";
    let usage: TokenUsage | null = null;
    let latencyMs: number | null = null;
    const started = Date.now();
    const report = (errorMessage: string | null, result: AnalysisResult | null) =>
      onAttempt?.({
        model: modelName,
        promptVersion: version,
        attempt,
        status: result ? "OK" : status,
        errorMessage,
        latencyMs: latencyMs ?? Date.now() - started,
        usage,
        costUsd: usage ? costUsd(modelName, usage) : null,
        verdict: result?.verdict ?? null,
        fastTrack: result?.fastTrack ?? null,
      });

    try {
      const response = await model.generateContent(prompt);
      latencyMs = Date.now() - started;
      usage = readUsage(response.response.usageMetadata);
      const text = response.response.text();
      const jsonText = stripJsonFences(text);

      status = "INVALID_JSON";
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(jsonText);
      } catch {
        throw new Error(`Model did not return valid JSON: ${text.slice(0, 500)}`);
      }

      status = "SCHEMA_MISMATCH";
      const parsed = AnalysisSchema.safeParse(parsedJson);
      if (!parsed.success) {
        throw new Error(`Model JSON did not match expected shape: ${parsed.error.message}`);
      }

      report(null, parsed.data);
      return { result: parsed.data, raw: text };
    } catch (err) {
      if (err instanceof PermanentAnalysisError) throw err;
      report(err instanceof Error ? err.message.slice(0, 1000) : String(err), null);
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Unknown analysis error";
  throw new Error(`Analysis failed after ${MAX_ATTEMPTS} attempts: ${message}`);
}
