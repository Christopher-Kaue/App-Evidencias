"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "../../lib/api-fetch";
import { AppShell } from "../components/AppShell";
import { authHeaders, getSessionUser, SessionUser } from "../../lib/session";

type Relatorio = {
  total_eventos: number;
  total_usuarios: number;
  total_evidencias: number;
  media_participantes: number;
  eventos: Array<{
    id: number;
    nome: string;
    data: string;
    local: string;
    sala: string;
    qtdparticipantes: number;
  }>;
};

export default function RelatoriosPage() {
  const [dados, setDados] = useState<Relatorio | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [erro, setErro] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const carregar = async () => {
    const session = getSessionUser();
    if (!session) return;
    setUser(session);
    setErro("");
    try {
      const json = await apiRequest("/api/reports.php", { headers: authHeaders(session) });
      if (!json.ok) {
        setErro((json.message || "Falha ao carregar relatorios.") + (json.detail ? ` (${json.detail})` : ""));
        setDados(null);
        return;
      }
      setDados(json.data as Relatorio);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar relatorios.");
      setDados(null);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const excluirRelatorio = async (id: number) => {
    const session = getSessionUser();
    if (!session || session.perfil !== "coordenador") return;
    const json = await apiRequest(`/api/reports.php?id=${id}`, {
      method: "DELETE",
      headers: authHeaders(session)
    });
    if (!json.ok) {
      setErro((json.message || "Falha ao excluir relatorio.") + (json.detail ? ` (${json.detail})` : ""));
      return;
    }
    await carregar();
  };

  const salvarRelatorio = async (evento: Relatorio["eventos"][number]) => {
    const session = getSessionUser();
    if (!session || session.perfil !== "coordenador") return;
    const json = await apiRequest("/api/reports.php", {
      method: "PUT",
      headers: authHeaders(session),
      body: JSON.stringify(evento)
    });
    if (!json.ok) {
      setErro((json.message || "Falha ao editar relatorio.") + (json.detail ? ` (${json.detail})` : ""));
      return;
    }
    setEditandoId(null);
    await carregar();
  };

  return (
    <AppShell>
      <section className="grid">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>
            {user?.perfil === "coordenador" ? "Relatorios gerais da coordenacao" : "Relatorios dos seus eventos"}
          </h2>
          {!dados && !erro && <p>Carregando...</p>}
          {!dados && erro && <p className="error-text">{erro}</p>}
          {dados && (
            <div className="grid grid-3">
              <div className="card"><strong>Total de eventos</strong><p>{dados.total_eventos}</p></div>
              {user?.perfil === "coordenador" && <div className="card"><strong>Total de usuarios</strong><p>{dados.total_usuarios}</p></div>}
              <div className="card"><strong>Total de evidencias</strong><p>{dados.total_evidencias}</p></div>
              <div className="card"><strong>Media de participantes</strong><p>{dados.media_participantes}</p></div>
            </div>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Eventos do relatorio</h3>
          {erro && <p className="error-text">{erro}</p>}
          <div className="grid">
            {dados?.eventos?.map((evento) => (
              <div key={evento.id} className="list-item">
                {editandoId === evento.id ? (
                  <form
                    className="grid"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      salvarRelatorio({
                        id: evento.id,
                        nome: String(fd.get("nome") ?? ""),
                        data: String(fd.get("data") ?? ""),
                        local: String(fd.get("local") ?? ""),
                        sala: String(fd.get("sala") ?? ""),
                        qtdparticipantes: Number(fd.get("qtdparticipantes") ?? 0)
                      });
                    }}
                  >
                    <input name="nome" className="field" defaultValue={evento.nome} required />
                    <input name="data" type="datetime-local" className="field" defaultValue={evento.data.slice(0, 16)} required />
                    <input name="local" className="field" defaultValue={evento.local} required />
                    <input name="sala" className="field" defaultValue={evento.sala} required />
                    <input name="qtdparticipantes" type="number" className="field" defaultValue={evento.qtdparticipantes} required min={1} />
                    <div className="row">
                      <button className="btn" type="submit">Salvar</button>
                      <button className="btn" type="button" onClick={() => setEditandoId(null)}>Cancelar</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <strong>{evento.nome}</strong>
                    <p style={{ margin: "6px 0" }}>
                      {new Date(evento.data).toLocaleString("pt-BR")} | {evento.local} - Sala {evento.sala}
                    </p>
                  </>
                )}
                {user?.perfil === "coordenador" && (
                  <div className="row">
                    <button className="btn" type="button" onClick={() => setEditandoId(evento.id)}>
                      Editar
                    </button>
                    <Link href="/eventos" className="btn" style={{ textDecoration: "none" }}>
                      Abrir Eventos
                    </Link>
                    <button className="btn danger" type="button" onClick={() => excluirRelatorio(evento.id)}>
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
