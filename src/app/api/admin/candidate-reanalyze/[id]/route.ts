import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeResume } from "@/lib/analyze";
import { ProgrammeId } from "@/lib/rubric";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  try {
    const { result, raw } = await analyzeResume({
      programme: candidate.programme as ProgrammeId,
      candidateName: candidate.name,
      resumeText: candidate.resumeText,
    });

    const updated = await prisma.candidate.update({
      where: { id },
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

    return NextResponse.json({ candidate: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown analysis error";
    await prisma.candidate.update({ where: { id }, data: { analysisError: message } });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
