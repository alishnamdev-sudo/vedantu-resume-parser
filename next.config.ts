import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep pdf-parse/pdfjs out of the bundle so pdfjs can resolve its own pdf.worker.mjs from node_modules.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
