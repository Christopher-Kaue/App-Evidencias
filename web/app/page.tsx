"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isApiBaseConfigured } from "../lib/api";
import { apiFetch, readApiJson } from "../lib/api-fetch";
import { setSessionUser, type SessionUser } from "../lib/session";

export default function LoginPage() {
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const session = window.localStorage.getItem("app-evidencias-user");
    if (session) router.replace("/dashboard");
  }, [router]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErro("");
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    try {
      if (!isApiBaseConfigured()) {
        setErro(
          "URL da API nao configurada. No projeto do frontend na Vercel, defina NEXT_PUBLIC_API_BASE_URL com a URL do backend PHP (ex.: https://seu-projeto-api.vercel.app), sem barra no final, e faca um novo deploy."
        );
        return;
      }

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
    } catch {
      setErro(
        "Nao foi possivel conectar com a API (rede, CORS ou URL incorreta). Verifique NEXT_PUBLIC_API_BASE_URL e se o backend aceita origem do seu site."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-screen">
      <div className="login-card">
        <h1>Acesso ao sistema</h1>
        <p>Entre como professor ou coordenador para gerenciar eventos academicos.</p>
        {!isApiBaseConfigured() && (
          <p className="error-text" role="alert">
            Ambiente sem API: configure <code>NEXT_PUBLIC_API_BASE_URL</code> na Vercel (URL do projeto PHP) e redeploy.
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
