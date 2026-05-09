import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** next.config e avaliado antes do pipeline padrao do Next em alguns fluxos; sem isso .env.development nao aplica aos rewrites. */
const frontendDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(frontendDir);

const monorepoRoot = path.join(frontendDir, "..");
const onVercel = Boolean(process.env.VERCEL);

/** Origem publica do projeto PHP na Vercel (mesmo valor que NEXT_PUBLIC_API_BASE_URL no painel). */
const VERCEL_PHP_ORIGIN =
  process.env.NEXT_PUBLIC_VERCEL_PHP_ORIGIN?.trim() ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  "";

/** No deploy Vercel, o front usa /api-proxy/* (rewrite) para evitar CORS e bloqueios cross-origin. Defina NEXT_PUBLIC_API_VIA_PROXY=0 no painel para voltar ao modo direto + NEXT_PUBLIC_API_BASE_URL. */
const dashboardBypassProxy = process.env.NEXT_PUBLIC_API_VIA_PROXY === "0";
const useVercelEdgeProxy = onVercel && !dashboardBypassProxy;

/** Dev local: mesmo padrao da Vercel — fetch same-origin /api-proxy → PHP em DEV_PHP_ORIGIN. */
const enableLocalApiProxy = !onVercel && process.env.NEXT_PUBLIC_API_VIA_PROXY === "1";
const phpDevOrigin = (process.env.DEV_PHP_ORIGIN ?? "").trim() || "http://127.0.0.1:9999";

const nextPublicApiBaseUrl =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim() ||
  (onVercel && !useVercelEdgeProxy ? VERCEL_PHP_ORIGIN : "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: monorepoRoot,
  async rewrites() {
    if (!enableLocalApiProxy) return [];
    const origin = phpDevOrigin.replace(/\/+$/, "");
    return [{ source: "/api-proxy/:path*", destination: `${origin}/api/:path*` }];
  },
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
    ...(useVercelEdgeProxy ? { NEXT_PUBLIC_API_VIA_PROXY: "1" } : {}),
    ...(nextPublicApiBaseUrl ? { NEXT_PUBLIC_API_BASE_URL: nextPublicApiBaseUrl } : {})
  },
  // Na Vercel: export estatico + script pos-build copia out/ -> public/ quando o painel exige Output Directory "public"
  ...(onVercel ? { output: "export" as const } : {})
};

export default nextConfig;
