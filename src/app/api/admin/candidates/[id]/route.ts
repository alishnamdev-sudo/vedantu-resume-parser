import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }
  return NextResponse.json({ candidate });
}

const OverrideSchema = z.object({
  verdict: z.enum(["GTG", "ON_HOLD", "NOT_CONSIDERED"]),
  reason: z.string().trim().min(1, "Reason is required"),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = OverrideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const existing = await prisma.candidate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  const candidate = await prisma.candidate.update({
    where: { id },
    data: {
      verdict: parsed.data.verdict,
      reason: parsed.data.reason,
      matchedProfile: "Manually overridden by admin",
    },
  });

  return NextResponse.json({ candidate });
}
