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
      const localHint =
        base.includes("127.0.0.1:9999") || base.includes("localhost:9999")
          ? " Inicie a API com `npm run dev:api` (ou `npm run dev:local` para Next + PHP juntos)."
          : "";
      throw new Error(
        `Nao foi possivel conectar a API (${base}).${localHint} Na Vercel: rewrite /api-proxy. Local: confira MySQL, api/.env e NEXT_PUBLIC_API_BASE_URL.`
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
    const looksHtml = /^\s*</.test(text) || /<html[\s>]/i.test(text);
    const hint = looksHtml
      ? " A API devolveu HTML (rewrite errado ou projeto PHP inexistente). Vercel Web: confira NEXT_PUBLIC_API_BASE_URL no build e GET https://<php>/api/health.php. Local: npm run dev:api + URL http://127.0.0.1:9999."
      : "";
    return {
      ok: false,
      status: res.status,
      message: `Resposta invalida (${res.status}). Verifique a URL da API.${hint}`
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
