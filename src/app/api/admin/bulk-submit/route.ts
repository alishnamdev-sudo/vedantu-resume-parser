import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ACCEPTED_EXTENSIONS, detectResumeExtension } from "@/lib/resumeParse";
import { fetchRemoteResume, RemoteFetchError } from "@/lib/fetchRemoteFile";
import { createAndAnalyzeCandidate, ResumeTextError } from "@/lib/candidatePipeline";
import { PROGRAMMES, ProgrammeId, resolveProgramme } from "@/lib/rubric";

const PROGRAMME_IDS = PROGRAMMES.map((p) => p.id) as [ProgrammeId, ...ProgrammeId[]];

const RowSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  resumeUrl: z.string().trim().min(1, "Resume link is required"),
  subject: z.string().trim().max(200).optional().nullable(),
  programme: z.string().trim().min(1, "Programme is required"),
  email: z.string().trim().email("Invalid email address").optional(),
  phone: z.string().trim().max(30).optional(),
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

  const { name, resumeUrl, subject, email, phone } = parsed.data;

  const programme = resolveProgramme(parsed.data.programme);
  if (!programme || !PROGRAMME_IDS.includes(programme)) {
    return NextResponse.json(
      { error: `Unrecognised programme "${parsed.data.programme}".` },
      { status: 400 }
    );
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
    const { candidateId } = await createAndAnalyzeCandidate({
      name,
      email,
      phone,
      subject,
      programme,
      source: "BULK_CSV",
      resumeFileName: name.replace(/[^a-z0-9]+/gi, "_") + ext,
      resumeMimeType: contentType || "application/octet-stream",
      resumeBuffer: buffer,
      resumeExt: ext,
      resumeSourceUrl: resumeUrl,
    });
    return NextResponse.json({ ok: true, candidateId });
  } catch (err) {
    if (err instanceof ResumeTextError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
