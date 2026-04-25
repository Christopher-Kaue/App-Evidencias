"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { apiRequest } from "../../lib/api-fetch";
import { authHeaders, getSessionUser, SessionUser } from "../../lib/session";

type Relatorio = {
  total_eventos: number;
  total_usuarios: number;
  total_evidencias: number;
  media_participantes: number;
};

export default function DashboardPage() {
  const [dados, setDados] = useState<Relatorio | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const session = getSessionUser();
    if (!session) return;
    setUser(session);
    let cancelled = false;
    (async () => {
      try {
        const json = await apiRequest("/api/reports.php", { headers: authHeaders(session) });
        if (cancelled) return;
        if (json.ok && json.data) {
          setDados(json.data as Relatorio);
        } else {
          setDados(null);
        }
      } catch {
        if (!cancelled) setDados(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <section className="grid">
        <div className="hero-card">
          <h2>Painel de eventos academicos</h2>
          <p>
            {user?.perfil === "coordenador"
              ? "Visao completa para coordenacao: controle de usuarios, eventos e relatorios."
              : "Visao do professor: acompanhe seus eventos, anexos e indicadores de participacao."}
          </p>
        </div>
        <div className="grid grid-3">
          <article className="card">
            <h3>Total de eventos</h3>
            <p className="kpi">{dados?.total_eventos ?? 0}</p>
          </article>
          <article className="card">
            <h3>Total de evidencias</h3>
            <p className="kpi">{dados?.total_evidencias ?? 0}</p>
          </article>
          <article className="card">
            <h3>Media de participantes</h3>
            <p className="kpi">{dados?.media_participantes ?? 0}</p>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
