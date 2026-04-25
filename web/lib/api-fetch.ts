import { apiUrl, getApiBaseUrl } from "./api";

export const getApiConfigErrorMessage = (): string =>
  "Nao foi possivel determinar a URL da API. Em preview ou em URLs `*.vercel.app` longas (deploy unico), defina NEXT_PUBLIC_API_BASE_URL (ou NEXT_PUBLIC_API_HOST) no projeto Next — aponte para o host do projeto PHP (ex.: https://seu-projeto-api.vercel.app). Em producao estavel, pode omitir se o PHP for `<mesmo-slug>-api.vercel.app`.";

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(getApiConfigErrorMessage());
  }
  const url = apiUrl(path);
  try {
    return await fetch(url, {
      mode: "cors",
      cache: "no-store",
      ...init
    });
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(
        `Nao foi possivel conectar a API (${base}). Em URLs de preview/deploy da Vercel (varios hifens no host), defina NEXT_PUBLIC_API_BASE_URL ou NEXT_PUBLIC_API_HOST com a URL real do projeto PHP. Verifique tambem CORS, SSL/DNS e se o deploy da API esta ativo.`
      );
    }
    throw e;
  }
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
