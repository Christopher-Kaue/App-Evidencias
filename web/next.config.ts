import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const onVercel = Boolean(process.env.VERCEL);

/** Projeto PHP na Vercel deste repo; sobrescrito por NEXT_PUBLIC_API_BASE_URL (painel / vercel.json / .env). */
const DEFAULT_VERCEL_PHP_API = "https://api-christopher-kaues-projects.vercel.app";

const nextPublicApiBaseUrl =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim() ||
  (onVercel ? DEFAULT_VERCEL_PHP_API : "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
  // Garante que o export estatico embuta a URL da API no cliente (evita build sem ler vercel.json).
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
    ...(nextPublicApiBaseUrl ? { NEXT_PUBLIC_API_BASE_URL: nextPublicApiBaseUrl } : {})
  },
  // Na Vercel: export estatico + script pos-build copia out/ -> public/ quando o painel exige Output Directory "public"
  ...(onVercel ? { output: "export" as const } : {})
};

export default nextConfig;
