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

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : trimmed;
}

export async function analyzeResume(params: {
  programme: ProgrammeId;
  candidateName: string;
  resumeText: string;
  subject?: string | null;
}): Promise<{ result: AnalysisResult; raw: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key-here") {
    throw new Error(
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
}
