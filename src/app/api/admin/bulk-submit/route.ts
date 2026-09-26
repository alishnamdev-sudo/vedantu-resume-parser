import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ACCEPTED_EXTENSIONS, detectResumeExtension } from "@/lib/resumeParse";
import { fetchRemoteResume, RemoteFetchError } from "@/lib/fetchRemoteFile";
import { analyzeAndSaveCandidate, createAndAnalyzeCandidate, ResumeTextError } from "@/lib/candidatePipeline";
import { prisma } from "@/lib/prisma";
import { PROGRAMMES, ProgrammeId, resolveProgramme } from "@/lib/rubric";

const PROGRAMME_IDS = PROGRAMMES.map((p) => p.id) as [ProgrammeId, ...ProgrammeId[]];

const RowSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  resumeUrl: z.string().trim().min(1, "Resume link is required"),
  programme: z.string().trim().min(1, "Programme is required"),
  email: z.string().trim().email("Invalid email address").optional(),
  phone: z.string().trim().max(30).optional(),
  uploadedBy: z.string().trim().min(1, "Admin name is required").max(100),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = RowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid row." },
      { status: 400 }
    );
  }

  const { name, resumeUrl, email, phone, uploadedBy } = parsed.data;

  const programme = resolveProgramme(parsed.data.programme);
  if (!programme || !PROGRAMME_IDS.includes(programme)) {
    return NextResponse.json(
      { error: `Unrecognised programme "${parsed.data.programme}".` },
      { status: 400 }
    );
  }

  // Re-uploading a CSV (after a refresh, or by another admin) must not duplicate rows that
  // already made it in. Same resume link + programme = same candidate: finish its analysis
  // if that failed, otherwise report it as already uploaded.
  // ponytail: check-then-create, so the same link twice in one CSV can still race in
  // parallel; add a partial unique index on (resumeSourceUrl, programme) if that shows up.
  const existing = await prisma.candidate.findFirst({
    where: { source: "BULK_CSV", resumeSourceUrl: resumeUrl, programme },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    if (existing.verdict && !existing.analysisError) {
      return NextResponse.json({ ok: true, candidateId: existing.id, duplicate: true, analysisError: null });
    }
    const analysisError = await analyzeAndSaveCandidate(existing).then(
      () => null,
      (err) => (err instanceof Error ? err.message : "Unknown analysis error")
    );
    return NextResponse.json({ ok: true, candidateId: existing.id, duplicate: true, analysisError });
  }

  let buffer: Buffer;
  let contentType: string | null;
  try {
    ({ buffer, contentType } = await fetchRemoteResume(resumeUrl));
  } catch (err) {
    if (err instanceof RemoteFetchError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const ext = detectResumeExtension(buffer, contentType, resumeUrl);
  if (!ext) {
    return NextResponse.json(
      {
        error: `Couldn't tell that this was a resume file. Please link directly to a resume in one of these formats: ${ACCEPTED_EXTENSIONS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    const { candidateId, analysisError } = await createAndAnalyzeCandidate({
      name,
      email,
      phone,
      programme,
      source: "BULK_CSV",
      uploadedBy,
      resumeFileName: name.replace(/[^a-z0-9]+/gi, "_") + ext,
      resumeMimeType: contentType || "application/octet-stream",
      resumeBuffer: buffer,
      resumeExt: ext,
      resumeSourceUrl: resumeUrl,
    });
    return NextResponse.json({ ok: true, candidateId, duplicate: false, analysisError });
  } catch (err) {
    if (err instanceof ResumeTextError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
