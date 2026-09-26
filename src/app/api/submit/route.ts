import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  detectResumeExtension,
  isAcceptedResumeFile,
} from "@/lib/resumeParse";
import { createAndAnalyzeCandidate, ResumeTextError } from "@/lib/candidatePipeline";
import { PROGRAMMES, ProgrammeId } from "@/lib/rubric";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const SUBMISSIONS_PER_HOUR = 5;

const PROGRAMME_IDS = PROGRAMMES.map((p) => p.id) as [ProgrammeId, ...ProgrammeId[]];

const SubmissionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(6, "Enter a valid phone number").max(30),
  programme: z.enum(PROGRAMME_IDS),
});

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  const parsed = SubmissionSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    programme: formData.get("programme"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid submission.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please attach your resume." }, { status: 400 });
  }

  if (!isAcceptedResumeFile(file.name)) {
    return NextResponse.json(
      { error: `Please upload a resume in one of these formats: ${ACCEPTED_EXTENSIONS.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "That file is too large. Please upload a resume under 8MB." },
      { status: 400 }
    );
  }

  const { name, email, phone, programme } = parsed.data;
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = detectResumeExtension(buffer, file.type, file.name);
  if (!ext) {
    return NextResponse.json(
      { error: `Please upload a resume in one of these formats: ${ACCEPTED_EXTENSIONS.join(", ")}` },
      { status: 400 }
    );
  }

  // Checked here rather than up front so a rejected file or a typo'd form doesn't
  // burn the candidate's quota - only real pipeline runs, which cost money, count.
  const limit = rateLimit(`submit:${clientIp(request)}`, SUBMISSIONS_PER_HOUR, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many submissions from this network. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    const { candidateId } = await createAndAnalyzeCandidate({
      name,
      email,
      phone,
      programme,
      source: "FORM",
      resumeFileName: file.name,
      resumeMimeType: file.type || "application/octet-stream",
      resumeBuffer: buffer,
      resumeExt: ext,
    });
    return NextResponse.json({ ok: true, candidateId });
  } catch (err) {
    if (err instanceof ResumeTextError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
