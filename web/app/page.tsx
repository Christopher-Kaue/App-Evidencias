"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "../lib/api";
import { setSessionUser } from "../lib/session";

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
      const res = await fetch(apiUrl("/api/login.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) {
        setErro(json.message || "Falha no login.");
        return;
      }

      setSessionUser(json.data);
      router.replace("/dashboard");
    } catch {
      setErro("Nao foi possivel conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-screen">
      <div className="login-card">
        <h1>Acesso ao sistema</h1>
        <p>Entre como professor ou coordenador para gerenciar eventos academicos.</p>
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
