import { apiUrl, getApiBaseUrl } from "./api";

export const getApiConfigErrorMessage = (): string =>
  "Nao foi possivel determinar a URL da API. Em deploy preview, defina NEXT_PUBLIC_API_BASE_URL. Em producao, use projeto PHP <nome>-api.vercel.app com front <nome>.vercel.app ou defina a variavel.";

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  if (!base) {
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

export async function apiRequest(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data?: unknown; message?: string; detail?: string }> {
  const res = await apiFetch(path, init);
  return readApiJson(res);
}
