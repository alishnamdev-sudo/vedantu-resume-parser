import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeAndSaveCandidate } from "@/lib/candidatePipeline";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.candidate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  try {
    const candidate = await analyzeAndSaveCandidate(existing);
    return NextResponse.json({ candidate });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown analysis error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
