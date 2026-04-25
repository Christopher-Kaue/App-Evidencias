const trimSlash = (s: string): string => s.trim().replace(/\/+$/, "");

/**
 * URLs geradas pela Vercel (preview ou deploy unico) costumam ser
 * `{projeto}-{hash}-{time}.vercel.app` — varios segmentos. Nao devemos acrescentar `-api`
 * (geraria hosts inexistentes como `...-projects-api.vercel.app`).
 */
function isLikelyVercelDeploymentHostname(slug: string): boolean {
  if (slug.toLowerCase().includes("-git-")) return true;
  const parts = slug.split("-").filter(Boolean);
  return parts.length >= 5;
}

/**
 * Base absoluta do backend PHP (sem barra final).
 * 1) NEXT_PUBLIC_API_BASE_URL — prioridade (Vercel / .env.local)
 * 2) NEXT_PUBLIC_API_HOST — apenas hostname (ex.: meu-projeto-api.vercel.app) ou URL completa
 * 3) localhost → XAMPP (README)
 * 4) Producao Vercel: alias estavel `https://<slug>.vercel.app` → `https://<slug>-api.vercel.app`
 * 5) Preview (VERCEL_ENV), `-git-` no slug, ou hostname de deploy longo: "" — defina NEXT_PUBLIC_API_BASE_URL
 */
export function getApiBaseUrl(): string {
  const fromEnv = trimSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? "");
  if (fromEnv) return fromEnv;

  const fromHost = trimSlash(process.env.NEXT_PUBLIC_API_HOST ?? "");
  if (fromHost) {
    return fromHost.includes("://") ? fromHost : `https://${fromHost}`;
  }

  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return trimSlash("http://localhost/app-evidencias");
    }

    const m = hostname.match(/^([a-z0-9-]+)\.vercel\.app$/i);
    if (m) {
      const slug = m[1];
      if (slug.toLowerCase().endsWith("-api")) {
        return trimSlash(`${protocol}//${hostname}`);
      }
      const vercelEnv = (process.env.NEXT_PUBLIC_VERCEL_ENV ?? "").toLowerCase();
      if (vercelEnv === "preview") {
        return "";
      }
      if (isLikelyVercelDeploymentHostname(slug)) {
        return "";
      }
      return `https://${slug}-api.vercel.app`;
    }
  }

  if (process.env.NODE_ENV === "development") {
    return trimSlash("http://localhost/app-evidencias");
  }

  return "";
}

export function isApiBaseConfigured(): boolean {
  return Boolean(getApiBaseUrl());
}

export function apiUrl(path: string): string {
  const base = trimSlash(getApiBaseUrl());
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}
