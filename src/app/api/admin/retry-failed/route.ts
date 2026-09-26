import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeAndSaveCandidate } from "@/lib/candidatePipeline";

/**
 * Re-runs analysis for candidates whose verdict never landed — a Gemini rate-limit
 * blip mid-CSV otherwise leaves rows stranded with no bulk way back.
 *
 * ponytail: batched inside the request so it can't outlive a proxy timeout; the
 * caller re-POSTs while `remaining > 0`. Move to a background worker when bulk
 * upload itself moves server-side.
 */
const BATCH_SIZE = 20;
const CONCURRENCY = 3;

const UNRESOLVED = {
  OR: [{ analysisError: { not: null } }, { verdict: null }],
};

export async function POST(request: Request) {
  // Scoped to one admin's uploads when the dashboard's Admin filter is set.
  const body = await request.json().catch(() => null);
  const uploadedBy = typeof body?.uploadedBy === "string" && body.uploadedBy ? body.uploadedBy : undefined;
  const where = uploadedBy ? { ...UNRESOLVED, uploadedBy } : UNRESOLVED;

  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  let succeeded = 0;
  let failed = 0;

  let next = 0;
  async function runNext(): Promise<void> {
    const index = next++;
    if (index >= candidates.length) return;
    try {
      await analyzeAndSaveCandidate(candidates[index]);
      succeeded++;
    } catch {
      failed++;
    }
    return runNext();
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, candidates.length) }, () => runNext())
  );

  const remaining = await prisma.candidate.count({ where });

  return NextResponse.json({ attempted: candidates.length, succeeded, failed, remaining });
}
