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
    const raw = Object.fromEntries(fd.entries());
    const payload = {
      email: String(raw.email ?? "")
        .trim()
        .toLowerCase(),
      senha: String(raw.senha ?? "")
    };
    try {
      const res = await apiFetch("/api/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await readApiJson(res);

      if (!json.ok) {
        if (json.status === 403) {
          setErro(
            "Apenas contas com perfil professor ou coordenador entram nesta tela. " +
              "A conta admin@fadergs.com.br (e outras so com administrador) nao sao aceitas. " +
              "Tente: professor.teste@fadergs.com.br ou coordenador.teste@fadergs.com.br, senha Senha123 " +
              "(exige o seed do banco, ex. database/schema_cloud.sql importado no MySQL)."
          );
          return;
        }
        const extra = json.detail ? ` (${json.detail})` : "";
        const baseMsg = json.message || "Falha no login.";
        const hint401 =
          json.status === 401
            ? " Contas de teste: professor.teste@fadergs.com.br ou coordenador.teste@fadergs.com.br, senha Senha123 (se o schema/seed estiver no banco)."
            : "";
        setErro(baseMsg + extra + hint401);
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
            URL da API nao detectada (preview/deploy). Defina <code>NEXT_PUBLIC_API_BASE_URL</code> na Vercel ou em{" "}
            <code>web/.env.local</code>. Local: use <code>npm run dev:local</code> (PHP na porta 9999).
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
