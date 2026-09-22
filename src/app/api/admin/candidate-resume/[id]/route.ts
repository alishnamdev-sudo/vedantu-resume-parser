import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { UPLOAD_DIR } from "@/lib/uploadDir";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, candidate.resumeFilePath);
  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    return NextResponse.json({ error: "Resume file is missing on disk." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": candidate.resumeMimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(candidate.resumeFileName)}"`,
    },
  });
}
