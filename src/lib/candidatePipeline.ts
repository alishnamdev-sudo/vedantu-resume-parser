import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { analyzeResume } from "@/lib/analyze";
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

export async function createAndAnalyzeCandidate(params: {
  name: string;
  email?: string | null;
  phone?: string | null;
  subject?: string | null;
  programme: ProgrammeId;
  source: "FORM" | "BULK_CSV";
  resumeFileName: string;
  resumeMimeType: string;
  resumeBuffer: Buffer;
  resumeExt: ResumeExtension;
  resumeSourceUrl?: string | null;
}): Promise<{ candidateId: string }> {
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
      resumeFileName: params.resumeFileName,
      resumeFilePath: storedFileName,
      resumeMimeType: params.resumeMimeType,
      resumeText,
      resumeSourceUrl: params.resumeSourceUrl || null,
    },
  });

  try {
    const { result, raw } = await analyzeResume({
      programme: params.programme,
      candidateName: params.name,
      resumeText,
      subject: params.subject,
    });
    await prisma.candidate.update({
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
  }

  return { candidateId: candidate.id };
}
