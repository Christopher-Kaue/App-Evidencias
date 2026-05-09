export type UserRole = "professor" | "coordenador";

export type SessionUser = {
  id: number;
  nome: string;
  email: string;
  perfil: UserRole;
};

const SESSION_KEY = "app-evidencias-user";

export const getSessionUser = (): SessionUser | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.id || !parsed?.perfil) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const setSessionUser = (user: SessionUser): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const clearSessionUser = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
};

export const authHeaders = (user: SessionUser): HeadersInit => ({
  "Content-Type": "application/json",
  "X-Role": user.perfil,
  "X-User-Id": String(user.id)
});
