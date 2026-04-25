import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const onVercel = Boolean(process.env.VERCEL);

/** Projeto PHP na Vercel (mesmo host em web/vercel.json rewrites). */
const DEFAULT_VERCEL_PHP_API = "https://api-christopher-kaues-projects.vercel.app";

/** No deploy Vercel, o front usa /api-proxy/* (rewrite) para evitar CORS e bloqueios cross-origin. Defina NEXT_PUBLIC_API_VIA_PROXY=0 no painel para voltar ao modo direto + NEXT_PUBLIC_API_BASE_URL. */
const dashboardBypassProxy = process.env.NEXT_PUBLIC_API_VIA_PROXY === "0";
const useVercelEdgeProxy = onVercel && !dashboardBypassProxy;

const nextPublicApiBaseUrl =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim() ||
  (onVercel && !useVercelEdgeProxy ? DEFAULT_VERCEL_PHP_API : "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
    ...(useVercelEdgeProxy ? { NEXT_PUBLIC_API_VIA_PROXY: "1" } : {}),
    ...(nextPublicApiBaseUrl ? { NEXT_PUBLIC_API_BASE_URL: nextPublicApiBaseUrl } : {})
  },
  // Na Vercel: export estatico + script pos-build copia out/ -> public/ quando o painel exige Output Directory "public"
  ...(onVercel ? { output: "export" as const } : {})
};

export default nextConfig;
