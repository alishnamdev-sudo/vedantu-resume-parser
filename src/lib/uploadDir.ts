import path from "path";

/**
 * Where uploaded/downloaded resume files are stored on disk.
 * Defaults to ./uploads for local dev; on a host with a persistent volume
 * (e.g. Railway), set UPLOAD_DIR to a path inside that mounted volume.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
