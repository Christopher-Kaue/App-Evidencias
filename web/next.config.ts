import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const onVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
  // Na Vercel: export estatico + script pos-build copia out/ -> public/ quando o painel exige Output Directory "public"
  ...(onVercel ? { output: "export" as const } : {})
};

export default nextConfig;
