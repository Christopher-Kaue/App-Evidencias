import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const onVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
  // Disponivel no bundle do cliente para nao inferir URL da API em preview / URL de deploy unica
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? ""
  },
  // Na Vercel: export estatico + script pos-build copia out/ -> public/ quando o painel exige Output Directory "public"
  ...(onVercel ? { output: "export" as const } : {})
};

export default nextConfig;
