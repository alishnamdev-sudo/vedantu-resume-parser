import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { AnalysisTrigger, Candidate } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AnalysisAttempt, analyzeResume } from "@/lib/analyze";
import { extractResumeText, ResumeExtension } from "@/lib/resumeParse";
import { ProgrammeId } from "@/lib/rubric";
import { UPLOAD_DIR } from "@/lib/uploadDir";

export class ResumeTextError extends Error {}

export async function extractAndValidateResumeText(
  buffer: Buffer,
  ext: ResumeExtension
): Promise<string> {
  let resumeText: string;
  try {
    resumeText = await extractResumeText(buffer, ext);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read that file.";
    throw new ResumeTextError(message);
  }

  if (!resumeText || resumeText.length < 20) {
    throw new ResumeTextError(
      "Couldn't read any text from that file. It may be a scanned image rather than a real PDF/Word document."
    );
  }

  return resumeText;
}

/**
 * Runs the rubric analysis for an already-persisted candidate and saves the verdict.
 * Single place every caller goes through, so the prompt inputs (notably `subject`)
 * can't drift between first analysis and a later re-run.
 */
export async function analyzeAndSaveCandidate(
  candidate: Candidate,
  trigger: AnalysisTrigger
): Promise<Candidate> {
  const attempts: AnalysisAttempt[] = [];
  try {
    const { result, raw } = await analyzeResume(
      {
        programme: candidate.programme as ProgrammeId,
        candidateName: candidate.name,
        resumeText: candidate.resumeText,
        subject: candidate.subject,
      },
      (attempt) => attempts.push(attempt)
    );
    return await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        verdict: result.verdict,
        reason: result.reason,
        matchedProfile: result.matchedProfile,
        fastTrack: result.fastTrack,
        flags: JSON.stringify(result.flags),
        rawAnalysis: raw,
        analysisError: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown analysis error";
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: { analysisError: message },
    });
    throw err;
  } finally {
    await saveAnalysisRuns(candidate.id, trigger, attempts);
  }
}

/** Best-effort: the metrics log must never cost a candidate their verdict. */
async function saveAnalysisRuns(candidateId: string, trigger: AnalysisTrigger, attempts: AnalysisAttempt[]) {
  if (attempts.length === 0) return;
  try {
    await prisma.analysisRun.createMany({
      data: attempts.map((a) => ({
        candidateId,
        trigger,
        model: a.model,
        promptVersion: a.promptVersion,
        attempt: a.attempt,
        status: a.status,
        errorMessage: a.errorMessage,
        latencyMs: a.latencyMs,
        inputTokens: a.usage?.inputTokens,
        cachedInputTokens: a.usage?.cachedInputTokens,
        outputTokens: a.usage?.outputTokens,
        thinkingTokens: a.usage?.thinkingTokens,
        costUsd: a.costUsd,
        verdict: a.verdict,
        fastTrack: a.fastTrack,
      })),
    });
  } catch (err) {
    console.warn("Failed to record analysis runs", candidateId, err);
  }
}

export async function createAndAnalyzeCandidate(params: {
  name: string;
  email?: string | null;
  phone?: string | null;
  subject?: string | null;
  programme: ProgrammeId;
  source: "FORM" | "BULK_CSV";
  uploadedBy?: string | null;
  resumeFileName: string;
  resumeMimeType: string;
  resumeBuffer: Buffer;
  resumeExt: ResumeExtension;
  resumeSourceUrl?: string | null;
}): Promise<{ candidateId: string; analysisError: string | null }> {
  const resumeText = await extractAndValidateResumeText(params.resumeBuffer, params.resumeExt);

  await mkdir(UPLOAD_DIR, { recursive: true });
  const storedFileName = `${randomUUID()}${params.resumeExt}`;
  const storedFilePath = path.join(UPLOAD_DIR, storedFileName);
  await writeFile(storedFilePath, params.resumeBuffer);

  const candidate = await prisma.candidate.create({
    data: {
      name: params.name,
      email: params.email || null,
      phone: params.phone || null,
      subject: params.subject || null,
      programme: params.programme,
      source: params.source,
      uploadedBy: params.uploadedBy || null,
      resumeFileName: params.resumeFileName,
      resumeFilePath: storedFileName,
      resumeMimeType: params.resumeMimeType,
      resumeText,
      resumeSourceUrl: params.resumeSourceUrl || null,
    },
  });

  // The candidate row is already committed; a failed analysis is recorded on the row
  // (analysisError) and retried later. The public form ignores it; bulk upload shows it.
  const analysisError = await analyzeAndSaveCandidate(candidate, params.source).then(
    () => null,
    (err) => (err instanceof Error ? err.message : "Unknown analysis error")
  );

  return { candidateId: candidate.id, analysisError };
}
