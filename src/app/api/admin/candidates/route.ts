import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const verdict = searchParams.get("verdict");
  const programme = searchParams.get("programme");
  const q = searchParams.get("q")?.trim();
  const uploadedBy = searchParams.get("uploadedBy");

  const where: Prisma.CandidateWhereInput = {};

  if (uploadedBy) {
    where.uploadedBy = uploadedBy;
  }

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
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
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
      uploadedBy: true,
      verdict: true,
      fastTrack: true,
      analysisError: true,
      createdAt: true,
    },
  });

  // Feeds the dashboard's Admin filter, so it lists every uploader regardless of the current filters.
  const uploaders = await prisma.candidate.findMany({
    where: { uploadedBy: { not: null } },
    distinct: ["uploadedBy"],
    orderBy: { uploadedBy: "asc" },
    select: { uploadedBy: true },
  });

  return NextResponse.json({ candidates, admins: uploaders.map((u) => u.uploadedBy) });
}
