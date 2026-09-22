import { MAX_FILE_SIZE_BYTES } from "./resumeParse";

const FETCH_TIMEOUT_MS = 20_000;

function extractGoogleDriveFileId(url: URL): string | null {
  if (!url.hostname.endsWith("drive.google.com") && !url.hostname.endsWith("docs.google.com")) {
    return null;
  }

  // https://drive.google.com/file/d/<id>/view?usp=sharing
  const pathMatch = url.pathname.match(/\/d\/([^/]+)/);
  if (pathMatch) return pathMatch[1];

  // https://drive.google.com/open?id=<id>  or  ...?id=<id>&export=download
  const idParam = url.searchParams.get("id");
  if (idParam) return idParam;

  return null;
}

/** Normalizes a shared Google Drive link into a direct-download URL. */
function toDirectDownloadUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const fileId = extractGoogleDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return rawUrl;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VEL-ResumeBot/1.0)" },
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Google's "file too large to scan" interstitial page carries a confirm token we can retry with. */
function extractDriveConfirmUrl(html: string, originalUrl: string): string | null {
  const actionMatch = html.match(/action="([^"]+)"/);
  if (actionMatch) {
    return actionMatch[1].replace(/&amp;/g, "&");
  }
  const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/);
  if (confirmMatch) {
    const separator = originalUrl.includes("?") ? "&" : "?";
    return `${originalUrl}${separator}confirm=${confirmMatch[1]}`;
  }
  return null;
}

export class RemoteFetchError extends Error {}

export async function fetchRemoteResume(
  rawUrl: string
): Promise<{ buffer: Buffer; contentType: string | null }> {
  let url: string;
  try {
    url = toDirectDownloadUrl(rawUrl.trim());
    void new URL(url); // throws if not a well-formed URL
  } catch {
    throw new RemoteFetchError("That doesn't look like a valid URL.");
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(url);
  } catch (err) {
    const message = err instanceof Error && err.name === "AbortError" ? "Timed out fetching the file." : "Could not reach that link.";
    throw new RemoteFetchError(message);
  }

  if (!response.ok) {
    throw new RemoteFetchError(`Link returned an error (HTTP ${response.status}).`);
  }

  let contentType = response.headers.get("content-type");
  let buffer = Buffer.from(await response.arrayBuffer());

  // A Google Drive "can't scan this file for viruses" interstitial comes back as HTML.
  if (contentType?.includes("text/html") && url.includes("drive.google.com")) {
    const confirmUrl = extractDriveConfirmUrl(buffer.toString("utf8"), url);
    if (confirmUrl) {
      const retryResponse = await fetchWithTimeout(confirmUrl);
      if (retryResponse.ok) {
        contentType = retryResponse.headers.get("content-type");
        buffer = Buffer.from(await retryResponse.arrayBuffer());
      }
    }
  }

  if (contentType?.includes("text/html")) {
    throw new RemoteFetchError(
      "That link returned a web page instead of a file. Make sure it's a direct download link, or that the Google Drive file is shared as \"Anyone with the link can view.\""
    );
  }

  if (buffer.length === 0) {
    throw new RemoteFetchError("Downloaded file was empty.");
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new RemoteFetchError("File is too large (over 8MB).");
  }

  return { buffer, contentType };
}
