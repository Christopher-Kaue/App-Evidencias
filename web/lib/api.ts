const raw = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

/** Base URL do backend PHP (obrigatoria em producao na Vercel). */
export const API_BASE_URL = raw;

export const isApiBaseConfigured = (): boolean => Boolean(API_BASE_URL);

export const apiUrl = (path: string): string => {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) {
    return p;
  }
  return `${API_BASE_URL}${p}`;
};
