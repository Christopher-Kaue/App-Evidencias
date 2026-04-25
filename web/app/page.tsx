"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "../lib/api";
import { apiFetch, getApiConfigErrorMessage, readApiJson } from "../lib/api-fetch";
import { setSessionUser, type SessionUser } from "../lib/session";

export default function LoginPage() {
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [semApiUrl, setSemApiUrl] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const session = window.localStorage.getItem("app-evidencias-user");
    if (session) router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    setSemApiUrl(!getApiBaseUrl());
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErro("");
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await apiFetch("/api/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await readApiJson(res);

      if (!json.ok) {
        const extra = json.detail ? ` (${json.detail})` : "";
        setErro((json.message || "Falha no login.") + extra);
        return;
      }

      if (!json.data || typeof json.data !== "object") {
        setErro("Resposta da API sem dados de sessao.");
        return;
      }

      setSessionUser(json.data as SessionUser);
      router.replace("/dashboard");
    } catch (err) {
      setErro(err instanceof Error ? err.message : getApiConfigErrorMessage());
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-screen">
      <div className="login-card">
        <h1>Acesso ao sistema</h1>
        <p>Entre como professor ou coordenador para gerenciar eventos academicos.</p>
        {semApiUrl && (
          <p className="error-text" role="alert">
            URL da API nao detectada (ex.: deploy preview). Defina <code>NEXT_PUBLIC_API_BASE_URL</code> ou{" "}
            <code>NEXT_PUBLIC_API_HOST</code> na Vercel e redeploy.
          </p>
        )}
        <form onSubmit={onSubmit} className="grid">
          <label>
            Email
            <input name="email" type="email" className="field" required />
          </label>
          <label>
            Senha
            <input name="senha" type="password" className="field" required />
          </label>
          <button className="btn" disabled={loading} type="submit">
            {loading ? "Entrando..." : "Entrar"}
          </button>
          {erro && <p className="error-text">{erro}</p>}
        </form>
      </div>
    </section>
  );
}
