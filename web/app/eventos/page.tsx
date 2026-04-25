"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, apiRequest, readApiJson } from "../../lib/api-fetch";
import { AppShell } from "../components/AppShell";
import { authHeaders, getSessionUser, SessionUser } from "../../lib/session";

type Evento = {
  id: number;
  nome: string;
  data: string;
  local: string;
  sala: string;
  qtdparticipantes: number;
  card?: string;
  idusuario: number;
};

const getMediaType = (url: string): "image" | "video" | "other" => {
  const clean = url.toLowerCase().split("?")[0];
  if (/\.(jpg|jpeg|png|webp|gif)$/.test(clean)) return "image";
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(clean)) return "video";
  return "other";
};

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [erro, setErro] = useState("");
  const [midiaInput, setMidiaInput] = useState("");
  const [midias, setMidias] = useState<string[]>([]);
  const [editando, setEditando] = useState<Evento | null>(null);
  const [uploading, setUploading] = useState(false);

  const carregar = async () => {
    const session = getSessionUser();
    if (!session) return;
    setUser(session);
    setErro("");
    try {
      const json = await apiRequest("/api/events.php", { headers: authHeaders(session) });
      if (!json.ok) {
        setErro((json.message || "Nao foi possivel carregar os eventos.") + (json.detail ? ` (${json.detail})` : ""));
        setEventos([]);
        return;
      }
      setEventos((json.data as Evento[]) || []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Nao foi possivel carregar os eventos.");
      setEventos([]);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro("");
    const fd = new FormData(e.currentTarget);
    const payload = { ...Object.fromEntries(fd.entries()), midias };
    const session = getSessionUser();
    if (!session) return;

    const json = await apiRequest("/api/events.php", {
      method: editando ? "PUT" : "POST",
      headers: authHeaders(session),
      body: JSON.stringify(payload)
    });

    if (!json.ok) {
      setErro((json.message || "Falha ao salvar evento.") + (json.detail ? ` (${json.detail})` : ""));
      return;
    }

    e.currentTarget.reset();
    setMidias([]);
    setMidiaInput("");
    setEditando(null);
    await carregar();
  };

  const iniciarEdicao = (ev: Evento) => {
    setEditando(ev);
    try {
      const parsed = ev.card ? JSON.parse(ev.card) : [];
      setMidias(Array.isArray(parsed) ? parsed : []);
    } catch {
      setMidias([]);
    }
  };

  const excluir = async (id: number) => {
    const session = getSessionUser();
    if (!session || session.perfil !== "coordenador") return;
    const json = await apiRequest(`/api/events.php?id=${id}`, {
      method: "DELETE",
      headers: authHeaders(session)
    });
    if (!json.ok) {
      setErro((json.message || "Falha ao excluir evento.") + (json.detail ? ` (${json.detail})` : ""));
      return;
    }
    await carregar();
  };

  const uploadArquivo = async (file: File) => {
    const session = getSessionUser();
    if (!session) return;
    setErro("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const res = await apiFetch("/api/upload.php", {
        method: "POST",
        headers: {
          "X-Role": session.perfil,
          "X-User-Id": String(session.id)
        },
        body: fd
      });
      const json = await readApiJson(res);
      if (!json.ok) {
        setErro((json.message || "Falha no upload.") + (json.detail ? ` (${json.detail})` : ""));
        return;
      }
      const data = json.data as { url?: string } | undefined;
      const url = data?.url;
      if (url) {
        setMidias((prev) => [...prev, url]);
      }
    } catch {
      setErro("Nao foi possivel enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell>
      <section className="grid">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{editando ? "Editar evento" : "Cadastrar evento"}</h2>
          <form onSubmit={onSubmit} className="grid">
            {editando && <input type="hidden" name="id" defaultValue={editando.id} />}
            <label>Nome<input name="nome" className="field" required defaultValue={editando?.nome ?? ""} /></label>
            <label>Data/Hora<input name="data" type="datetime-local" className="field" required defaultValue={editando?.data?.slice(0, 16) ?? ""} /></label>
            <div className="row">
              <label style={{ flex: 1 }}>Local<input name="local" className="field" required defaultValue={editando?.local ?? ""} /></label>
              <label style={{ flex: 1 }}>Sala<input name="sala" className="field" required defaultValue={editando?.sala ?? ""} /></label>
            </div>
            <label>Qtd. participantes<input name="qtdparticipantes" type="number" className="field" required min={1} defaultValue={editando?.qtdparticipantes ?? 1} /></label>
            <label>
              Anexar foto/video por URL
              <div className="row">
                <input value={midiaInput} onChange={(e) => setMidiaInput(e.target.value)} className="field" />
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    if (!midiaInput.trim()) return;
                    setMidias((prev) => [...prev, midiaInput.trim()]);
                    setMidiaInput("");
                  }}
                >
                  Adicionar
                </button>
              </div>
            </label>
            <label>
              Upload real de foto/video
              <input
                type="file"
                className="field"
                accept="image/*,video/*"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  uploadArquivo(file);
                  e.currentTarget.value = "";
                }}
              />
              {uploading && <p style={{ margin: "6px 0 0 0" }}>Enviando arquivo...</p>}
            </label>
            {midias.length > 0 && (
              <div className="grid">
                {midias.map((midia, index) => (
                  <div key={`${midia}-${index}`} className="list-item">
                    <p style={{ margin: "0 0 8px 0" }}>{midia}</p>
                    {getMediaType(midia) === "image" && (
                      <img
                        src={midia}
                        alt="Anexo de evento"
                        style={{ width: "100%", maxWidth: 360, borderRadius: 10, marginBottom: 8 }}
                      />
                    )}
                    {getMediaType(midia) === "video" && (
                      <video
                        src={midia}
                        controls
                        style={{ width: "100%", maxWidth: 420, borderRadius: 10, marginBottom: 8 }}
                      />
                    )}
                    <button
                      className="btn danger"
                      type="button"
                      onClick={() => setMidias((prev) => prev.filter((_, i) => i !== index))}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button className="btn" type="submit">{editando ? "Salvar alteracoes" : "Salvar evento"}</button>
            {erro && <p className="error-text">{erro}</p>}
          </form>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Eventos cadastrados</h2>
          <div className="grid">
            {eventos.map((ev) => {
              let anexos: string[] = [];
              try {
                anexos = ev.card ? JSON.parse(ev.card) : [];
              } catch {
                anexos = [];
              }
              return (
                <div key={ev.id} className="list-item">
                  <strong>{ev.nome}</strong>
                  <p style={{ margin: "8px 0" }}>{new Date(ev.data).toLocaleString("pt-BR")} - {ev.local} / Sala {ev.sala}</p>
                  {Array.isArray(anexos) && anexos.length > 0 && (
                    <div className="grid" style={{ marginBottom: 8 }}>
                      <p style={{ margin: 0 }}>Anexos: {anexos.length}</p>
                      {anexos.map((anexo, anexoIndex) => (
                        <div key={`${anexo}-${anexoIndex}`}>
                          {getMediaType(anexo) === "image" && (
                            <img
                              src={anexo}
                              alt="Imagem do evento"
                              style={{ width: "100%", maxWidth: 300, borderRadius: 10 }}
                            />
                          )}
                          {getMediaType(anexo) === "video" && (
                            <video
                              src={anexo}
                              controls
                              style={{ width: "100%", maxWidth: 360, borderRadius: 10 }}
                            />
                          )}
                          {getMediaType(anexo) === "other" && (
                            <a href={anexo} target="_blank" rel="noreferrer">
                              Abrir anexo
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="row">
                    <button className="btn" type="button" onClick={() => iniciarEdicao(ev)}>Editar</button>
                    {user?.perfil === "coordenador" && (
                      <button className="btn danger" type="button" onClick={() => excluir(ev.id)}>Excluir</button>
                    )}
                  </div>
                </div>
              );
            })}
            {eventos.length === 0 && <p>Nenhum evento cadastrado.</p>}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
