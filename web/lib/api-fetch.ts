import { apiUrl, isApiBaseConfigured } from "./api";

export const getApiConfigErrorMessage = (): string =>
  "Configure NEXT_PUBLIC_API_BASE_URL no projeto da Vercel (URL https do backend PHP) e faca redeploy.";

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!isApiBaseConfigured()) {
    throw new Error(getApiConfigErrorMessage());
  }
  return fetch(apiUrl(path), init);
}

export async function readApiJson(res: Response): Promise<{
  ok: boolean;
  status: number;
  data?: unknown;
  message?: string;
  detail?: string;
}> {
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {
      ok: false,
      status: res.status,
      message: `Resposta invalida (${res.status}). Verifique a URL da API.`
    };
  }
  return {
    ok: res.ok,
    status: res.status,
    data: parsed.data,
    message: typeof parsed.message === "string" ? parsed.message : undefined,
    detail: typeof parsed.detail === "string" ? parsed.detail : undefined
  };
}

/** Fetch + parse JSON (corpo sempre consumido). */
export async function apiRequest(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data?: unknown; message?: string; detail?: string }> {
  const res = await apiFetch(path, init);
  return readApiJson(res);
}
