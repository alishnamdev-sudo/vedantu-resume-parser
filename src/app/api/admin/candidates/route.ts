import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const verdict = searchParams.get("verdict");
  const programme = searchParams.get("programme");
  const q = searchParams.get("q")?.trim();

  const where: Prisma.CandidateWhereInput = {};

  if (verdict === "PENDING") {
    where.verdict = null;
  } else if (verdict === "GTG" || verdict === "ON_HOLD" || verdict === "NOT_CONSIDERED") {
    where.verdict = verdict;
  }

  if (programme === "PHONICS" || programme === "SUPER_SPEAKERS" || programme === "SUPER_CODERS" || programme === "SUPER_MATH") {
    where.programme = programme;
  }

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      subject: true,
      programme: true,
      source: true,
      verdict: true,
      fastTrack: true,
      analysisError: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ candidates });
}
