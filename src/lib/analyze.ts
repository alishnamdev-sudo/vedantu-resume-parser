import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { buildAnalysisPrompt, ProgrammeId } from "./rubric";

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

export async function analyzeResume(params: {
  programme: ProgrammeId;
  candidateName: string;
  resumeText: string;
  subject?: string | null;
}): Promise<{ result: AnalysisResult; raw: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key-here") {
    throw new PermanentAnalysisError(
      "GEMINI_API_KEY is not configured. Add it to your .env file to enable resume analysis."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = buildAnalysisPrompt(params);

  // Both failure modes worth retrying are transient: Gemini rate-limits/5xx, and the
  // occasional response that isn't the JSON we asked for. Same backoff handles both.
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const jsonText = stripJsonFences(text);

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(jsonText);
      } catch {
        throw new Error(`Model did not return valid JSON: ${text.slice(0, 500)}`);
      }

      const parsed = AnalysisSchema.safeParse(parsedJson);
      if (!parsed.success) {
        throw new Error(`Model JSON did not match expected shape: ${parsed.error.message}`);
      }

      return { result: parsed.data, raw: text };
    } catch (err) {
      if (err instanceof PermanentAnalysisError) throw err;
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Unknown analysis error";
  throw new Error(`Analysis failed after ${MAX_ATTEMPTS} attempts: ${message}`);
}
