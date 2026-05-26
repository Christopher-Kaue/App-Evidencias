"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "../lib/api";
import { apiFetch, getApiConfigErrorMessage, readApiJson } from "../lib/api-fetch";
import { setSessionUser, type SessionUser } from "../lib/session";
import fadergsLogo from "./assets/fadergs-logo.png";

/** Texto único para contas de teste + schema (PostgreSQL). */
const LOGIN_HELP_POSTGRES =
  "Contas de teste: nome Professor Teste ou Coordenador Teste, senha Senha123. " +
  "A base deve estar criada com database/schema_postgres.sql.";

/** Quando a API devolve 403 (só administrador ou sem perfil professor/coordenador). */
const LOGIN_MSG_PERFIL_NAO_PERMITIDO =
  "Apenas contas com perfil professor ou coordenador entram nesta aplicação. " +
  LOGIN_HELP_POSTGRES;

export default function LoginPage() {
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
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
    const payload = {
      nome: nome.trim(),
      senha
    };
    try {
      const res = await apiFetch("/api/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await readApiJson(res);

      if (!json.ok) {
        if (json.code === "schema_missing") {
          setErro(json.message ?? LOGIN_HELP_POSTGRES);
          return;
        }
        const apiMsg = json.message ?? "";
        if (json.status === 403 || /perfil sem acesso ao sistema/i.test(apiMsg)) {
          setErro(LOGIN_MSG_PERFIL_NAO_PERMITIDO);
          return;
        }
        const extra = json.detail ? ` (${json.detail})` : "";
        const baseMsg = json.message || "Falha no login.";
        const hint401 = json.status === 401 ? ` ${LOGIN_HELP_POSTGRES}` : "";
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
        <img className="login-logo" src={fadergsLogo.src} alt="FADERGS Centro Universitario" />
        <h1>Acesso ao sistema</h1>
        <p>Entre como professor ou coordenador para gerenciar eventos academicos.</p>
        {semApiUrl && (
          <p className="error-text" role="alert">
            URL da API nao detectada (preview/deploy). Defina <code>NEXT_PUBLIC_API_BASE_URL</code> na Vercel ou em{" "}
            <code>frontend/.env.local</code>. Local: use <code>npm run dev:local</code> (PHP na porta 9999).
          </p>
        )}
        <form onSubmit={onSubmit} className="grid" autoComplete="on">
          <label htmlFor="login-nome">
            Nome
            <input
              id="login-nome"
              name="nome"
              type="text"
              autoCapitalize="words"
              autoComplete="username"
              className="field"
              required
              suppressHydrationWarning
              value={nome ?? ""}
              onChange={(ev) => setNome(ev.target.value ?? "")}
            />
          </label>
          <label htmlFor="login-senha">
            Senha
            <input
              id="login-senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              className="field"
              required
              suppressHydrationWarning
              value={senha ?? ""}
              onChange={(ev) => setSenha(ev.target.value ?? "")}
            />
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
