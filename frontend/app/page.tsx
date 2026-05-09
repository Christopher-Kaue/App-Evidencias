"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "../lib/api";
import { apiFetch, getApiConfigErrorMessage, readApiJson } from "../lib/api-fetch";
import { setSessionUser, type SessionUser } from "../lib/session";
import fadergsLogo from "./assets/fadergs-logo.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
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
      email: email.trim().toLowerCase(),
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
        if (json.status === 403) {
          setErro(
            "Apenas contas com perfil professor ou coordenador entram nesta tela. " +
              "A conta admin@fadergs.com.br (e outras so com administrador) nao sao aceitas. " +
              "Tente: professor.teste@fadergs.com.br ou coordenador.teste@fadergs.com.br, senha Senha123 " +
              "(exige o schema no PostgreSQL: database/schema_postgres.sql)."
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
          <label htmlFor="login-email">
            Email
            <input
              id="login-email"
              name="email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              className="field"
              required
              suppressHydrationWarning
              value={email ?? ""}
              onChange={(ev) => setEmail(ev.target.value ?? "")}
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
