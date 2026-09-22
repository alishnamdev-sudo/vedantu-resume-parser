export const ACCEPTED_EXTENSIONS = [".pdf", ".docx"] as const;
export type ResumeExtension = (typeof ACCEPTED_EXTENSIONS)[number];
export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx).toLowerCase();
}

export function isAcceptedResumeFile(fileName: string): boolean {
  const ext = getExtension(fileName);
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Bulk-imported resumes come from arbitrary links (Google Drive, etc.) whose
 * URL rarely ends in a real file extension, so we sniff the actual format
 * from magic bytes / Content-Type instead of trusting the URL.
 */
export function detectResumeExtension(
  buffer: Buffer,
  contentType: string | null,
  urlOrFileName: string
): ResumeExtension | null {
  const fromName = getExtension(urlOrFileName);
  if (fromName === ".pdf" || fromName === ".docx") return fromName;

  if (contentType?.includes("application/pdf")) return ".pdf";
  if (
    contentType?.includes(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
  ) {
    return ".docx";
  }

  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("latin1") === "%PDF") {
    return ".pdf";
  }
  // .docx files are zip archives, which start with a "PK" local file header.
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return ".docx";
  }

  return null;
}

export async function extractResumeText(buffer: Buffer, ext: ResumeExtension): Promise<string> {
  if (ext === ".pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}
