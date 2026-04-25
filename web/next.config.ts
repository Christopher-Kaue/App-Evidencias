import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Inclui arquivos da raiz do repo no trace (monorepo); evita Lambdas incompletas na Vercel
  outputFileTracingRoot: monorepoRoot
};

export default nextConfig;
