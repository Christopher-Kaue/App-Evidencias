"use client";

import { FormEvent, useEffect, useState } from "react";
import { dedupeById } from "../../lib/dedupe-by-id";
import { apiFetch, apiRequest, readApiJson } from "../../lib/api-fetch";
import { AppShell } from "../components/AppShell";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MediaPreview } from "../components/MediaPreview";
import { useFlashMessage } from "../../lib/use-flash-message";
import { getMediaType } from "../../lib/media-url";
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
  idareacurso?: number | null;
  publicoalvo?: string;
  cargahoraria?: number | null;
  qtdprofessores?: number;
};

type Local = {
  id: number;
  nome: string;
};

type Sala = {
  id: number;
  nome: string;
};

type AreaCurso = {
  id: number;
  nome: string;
};

type EventCardData = {
  midias: string[];
  capa: string;
};

const parseEventCard = (card?: string): EventCardData => {
  if (!card) return { midias: [], capa: "" };
  try {
    const parsed = JSON.parse(card) as unknown;
    if (Array.isArray(parsed)) {
      return { midias: parsed.filter((item): item is string => typeof item === "string"), capa: "" };
    }
    if (parsed && typeof parsed === "object") {
      const data = parsed as { midias?: unknown; capa?: unknown };
      const midias = Array.isArray(data.midias)
        ? data.midias.filter((item): item is string => typeof item === "string")
        : [];
      const capa = typeof data.capa === "string" && midias.includes(data.capa) ? data.capa : "";
      return { midias, capa };
    }
  } catch {
    return { midias: [], capa: "" };
  }
  return { midias: [], capa: "" };
};

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [erro, setErro] = useState("");
  const { message: sucesso, showSuccess, clear: clearSucesso } = useFlashMessage();
  const [midias, setMidias] = useState<string[]>([]);
  const [capaEvento, setCapaEvento] = useState("");
  const [editando, setEditando] = useState<Evento | null>(null);
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState<number | null>(null);
  const [confirmarRemoverMidia, setConfirmarRemoverMidia] = useState<{ url: string; index: number } | null>(null);
  const [conflitoMensagem, setConflitoMensagem] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [locais, setLocais] = useState<Local[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [areas, setAreas] = useState<AreaCurso[]>([]);
  const [localSelecionado, setLocalSelecionado] = useState("");
  const [salaSelecionada, setSalaSelecionada] = useState("");
  const [areaSelecionada, setAreaSelecionada] = useState("");
  const [publicoAlvoTexto, setPublicoAlvoTexto] = useState("");

  const isCoordenador = user?.perfil === "coordenador";

  const ordenarPorDataDesc = (lista: Evento[]) =>
    [...lista].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const carregar = async (silencioso = false) => {
    const session = getSessionUser();
    if (!session) return;
    setUser(session);
    if (!silencioso) setErro("");
    try {
      const json = await apiRequest("/api/events.php", { headers: authHeaders(session) });
      if (!json.ok) {
        if (!silencioso) {
          setErro((json.message || "Nao foi possivel carregar os eventos.") + (json.detail ? ` (${json.detail})` : ""));
          setEventos([]);
        }
        return;
      }
      setEventos(ordenarPorDataDesc(dedupeById((json.data as Evento[]) || [])));
    } catch (e) {
      if (!silencioso) {
        setErro(e instanceof Error ? e.message : "Nao foi possivel carregar os eventos.");
        setEventos([]);
      }
    }
  };

  const carregarConfiguracoes = async () => {
    const session = getSessionUser();
    if (!session) return;
    try {
      const [resLocais, resSalas, resAreas] = await Promise.all([
        apiRequest("/api/locais.php", { headers: authHeaders(session) }),
        apiRequest("/api/salas.php", { headers: authHeaders(session) }),
        apiRequest("/api/areas.php", { headers: authHeaders(session) })
      ]);
      if (resLocais.ok) setLocais((resLocais.data as Local[]) || []);
      if (resSalas.ok) setSalas((resSalas.data as Sala[]) || []);
      if (resAreas.ok) setAreas((resAreas.data as AreaCurso[]) || []);
    } catch {
      // silencioso: apenas deixa as listas vazias
    }
  };

  useEffect(() => {
    void carregar();
    void carregarConfiguracoes();
  }, []);

  useEffect(() => {
    if (editando) {
      setLocalSelecionado(editando.local ?? "");
      setSalaSelecionada(editando.sala ?? "");
      setAreaSelecionada(editando.idareacurso ? String(editando.idareacurso) : "");
      setPublicoAlvoTexto(editando.publicoalvo ?? "");
    }
  }, [editando]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setErro("");
    clearSucesso();

    const fd = new FormData(form);
    const payload = {
      ...Object.fromEntries(fd.entries()),
      local: localSelecionado,
      sala: salaSelecionada,
      capa: capaEvento,
      midias,
      idareacurso: areaSelecionada ? Number(areaSelecionada) : null,
      publicoalvo: publicoAlvoTexto.trim()
    };
    const session = getSessionUser();
    if (!session) return;

    try {
      const json = await apiRequest("/api/events.php", {
        method: editando ? "PUT" : "POST",
        headers: authHeaders(session),
        body: JSON.stringify(payload)
      });

      if (!json.ok) {
        if (json.status === 409) {
          setConflitoMensagem(json.message || "Ja existe um evento marcado nesta data.");
          return;
        }
        setErro((json.message || "Falha ao salvar evento.") + (json.detail ? ` (${json.detail})` : ""));
        return;
      }

      const eventoSalvo = (json.data as Evento | undefined) ?? null;
      if (eventoSalvo) {
        setEventos((prev) => {
          if (editando) {
            return ordenarPorDataDesc(dedupeById(prev.map((ev) => (ev.id === eventoSalvo.id ? eventoSalvo : ev))));
          }
          return ordenarPorDataDesc(dedupeById([eventoSalvo, ...prev.filter((ev) => ev.id !== eventoSalvo.id)]));
        });
        void carregar(true);
      } else {
        await carregar();
      }

      form.reset();
      setMidias([]);
      setCapaEvento("");
      setEditando(null);
      setLocalSelecionado("");
      setSalaSelecionada("");
      setAreaSelecionada("");
      setPublicoAlvoTexto("");
      showSuccess();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar evento.");
    }
  };

  const iniciarEdicao = (ev: Evento) => {
    setEditando(ev);
    const card = parseEventCard(ev.card);
    setMidias(card.midias);
    setCapaEvento(card.capa);
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setMidias([]);
    setCapaEvento("");
    setLocalSelecionado("");
    setSalaSelecionada("");
    setAreaSelecionada("");
    setPublicoAlvoTexto("");
  };

  const excluir = async (id: number) => {
    const session = getSessionUser();
    if (!session || session.perfil !== "coordenador") return;
    setConfirmarExclusaoId(null);
    try {
      const json = await apiRequest(`/api/events.php?id=${id}`, {
        method: "DELETE",
        headers: authHeaders(session)
      });
      if (!json.ok) {
        setErro((json.message || "Falha ao excluir evento.") + (json.detail ? ` (${json.detail})` : ""));
        return;
      }
      await carregar();
      showSuccess("Excluido com sucesso.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao excluir evento.");
    }
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

  const removerMidia = (midiaParaRemover: string, indiceParaRemover: number) => {
    setMidias((prev) => prev.filter((midia, index) => index !== indiceParaRemover || midia !== midiaParaRemover));
    setCapaEvento((capaAtual) => (capaAtual === midiaParaRemover ? "" : capaAtual));
    setConfirmarRemoverMidia(null);
  };

  return (
    <AppShell>
      <section className="grid">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{editando ? "Editar evento" : "Cadastrar evento"}</h2>
          {sucesso && <p className="success-text">{sucesso}</p>}
          <form onSubmit={onSubmit} className="grid">
            {editando && <input type="hidden" name="id" defaultValue={editando.id} />}
            <label>Nome<input name="nome" className="field" required defaultValue={editando?.nome ?? ""} /></label>
            <label>Data/Hora<input name="data" type="datetime-local" className="field" required defaultValue={editando?.data?.slice(0, 16) ?? ""} /></label>
            <div className="row">
              <label style={{ flex: 1 }}>
                Local
                <select
                  className="field"
                  value={localSelecionado}
                  onChange={(e) => setLocalSelecionado(e.target.value)}
                >
                  <option value="">Sem local definido</option>
                  {locais.map((l) => (
                    <option key={l.id} value={l.nome}>{l.nome}</option>
                  ))}
                </select>
              </label>
              <label style={{ flex: 1 }}>
                Sala
                <select
                  className="field"
                  value={salaSelecionada}
                  onChange={(e) => setSalaSelecionada(e.target.value)}
                >
                  <option value="">Sem sala definida</option>
                  {salas.map((s) => (
                    <option key={s.id} value={s.nome}>{s.nome}</option>
                  ))}
                </select>
              </label>
            </div>
            {locais.length === 0 && (
              <p style={{ margin: 0, color: "#7f1d28" }}>
                {isCoordenador
                  ? "Nenhum local cadastrado. Acesse Configuracoes para cadastrar."
                  : "Nenhum local cadastrado. Solicite ao coordenador se quiser usar esse campo."}
              </p>
            )}
            {salas.length === 0 && (
              <p style={{ margin: 0, color: "#7f1d28" }}>
                Nenhuma sala cadastrada.
                {isCoordenador ? " Acesse Configuracoes para cadastrar." : " Solicite ao coordenador se quiser usar esse campo."}
              </p>
            )}
            <label>
              Area do curso
              <select
                className="field"
                value={areaSelecionada}
                onChange={(e) => setAreaSelecionada(e.target.value)}
              >
                <option value="">Sem area definida</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            </label>
            {areas.length === 0 && (
              <p style={{ margin: 0, color: "#7f1d28" }}>
                Nenhuma area do curso cadastrada.
                {isCoordenador ? " Acesse Configuracoes para cadastrar." : " Solicite ao coordenador se quiser usar esse campo."}
              </p>
            )}
            <label>
              Publico alvo
              <input
                className="field"
                placeholder="Ex.: Alunos do 1o semestre, professores convidados..."
                value={publicoAlvoTexto}
                onChange={(e) => setPublicoAlvoTexto(e.target.value)}
                maxLength={255}
              />
            </label>
            <div className="row">
              <label style={{ flex: 1 }}>
                Carga horaria
                <input
                  name="cargahoraria"
                  type="number"
                  className="field"
                  min={0}
                  step="0.5"
                  defaultValue={editando?.cargahoraria ?? ""}
                />
              </label>
              <label style={{ flex: 1 }}>
                Numero de professores envolvidos
                <input
                  name="qtdprofessores"
                  type="number"
                  className="field"
                  min={0}
                  step={1}
                  defaultValue={editando?.qtdprofessores ?? 0}
                />
              </label>
            </div>
            <label>Qtd. participantes<input name="qtdparticipantes" type="number" className="field" min={0} defaultValue={editando?.qtdparticipantes ?? 0} /></label>
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
            {capaEvento && (
              <div className="list-item">
                <strong>Capa do evento</strong>
                <div style={{ marginTop: 8 }}>
                  <MediaPreview url={capaEvento} alt="Capa do evento" variant="full" />
                </div>
                <button
                  className="btn danger"
                  type="button"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    const indice = midias.findIndex((m) => m === capaEvento);
                    if (indice >= 0) {
                      setConfirmarRemoverMidia({ url: capaEvento, index: indice });
                    } else {
                      setCapaEvento("");
                    }
                  }}
                >
                  Remover capa
                </button>
              </div>
            )}
            {midias.length > 0 && (
              <div className="media-thumb-list">
                {midias.map((midia, index) => (
                  <div key={`${midia}-${index}`} className="media-thumb-item">
                    <MediaPreview url={midia} alt={`Anexo ${index + 1}`} variant="thumb" />
                    <div className="row" style={{ margin: 0 }}>
                      <button
                        className="btn danger"
                        type="button"
                        style={{ padding: "6px 10px", fontSize: 13 }}
                        onClick={(e) => {
                          e.preventDefault();
                          setConfirmarRemoverMidia({ url: midia, index });
                        }}
                      >
                        Remover
                      </button>
                      {getMediaType(midia) === "image" && (
                        <button
                          className="btn"
                          type="button"
                          style={{ padding: "6px 10px", fontSize: 13 }}
                          disabled={capaEvento === midia}
                          onClick={() => setCapaEvento(midia)}
                        >
                          {capaEvento === midia ? "Capa fixada" : "Fixar capa"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="row">
              <button className="btn" type="submit">{editando ? "Salvar alteracoes" : "Salvar evento"}</button>
              {editando && (
                <button className="btn" type="button" onClick={cancelarEdicao} style={{ background: "#8a8a8a" }}>
                  Cancelar
                </button>
              )}
            </div>
            {erro && <p className="error-text">{erro}</p>}
          </form>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Eventos cadastrados</h2>
          <div className="grid">
            {eventos.map((ev) => {
              const { midias: anexos, capa } = parseEventCard(ev.card);
              const detalhes = [ev.local, ev.sala ? `Sala ${ev.sala}` : ""].filter(Boolean).join(" / ");
              const areaNome = ev.idareacurso ? areas.find((a) => a.id === ev.idareacurso)?.nome ?? "" : "";
              const publicoAlvoEvento = (ev.publicoalvo ?? "").trim();
              return (
                <div key={ev.id} className="list-item">
                  {capa && (
                    <div style={{ marginBottom: 10, maxWidth: 420 }}>
                      <MediaPreview url={capa} alt={`Capa do evento ${ev.nome}`} variant="full" />
                    </div>
                  )}
                  <strong>{ev.nome}</strong>
                  <p style={{ margin: "8px 0" }}>
                    {new Date(ev.data).toLocaleString("pt-BR")}{detalhes ? ` - ${detalhes}` : ""}
                  </p>
                  {areaNome && (
                    <p style={{ margin: "4px 0" }}>
                      <strong>Area do curso:</strong> {areaNome}
                    </p>
                  )}
                  {publicoAlvoEvento && (
                    <p style={{ margin: "4px 0" }}>
                      <strong>Publico alvo:</strong> {publicoAlvoEvento}
                    </p>
                  )}
                  {ev.cargahoraria !== null && ev.cargahoraria !== undefined && (
                    <p style={{ margin: "4px 0" }}>
                      <strong>Carga horaria:</strong> {ev.cargahoraria}h
                    </p>
                  )}
                  {!!ev.qtdprofessores && (
                    <p style={{ margin: "4px 0" }}>
                      <strong>Professores envolvidos:</strong> {ev.qtdprofessores}
                    </p>
                  )}
                  {Array.isArray(anexos) && anexos.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <p style={{ margin: "0 0 8px 0" }}>Anexos: {anexos.length}</p>
                      <div className="media-thumb-list">
                        {anexos.map((anexo, anexoIndex) => (
                          <div key={`${anexo}-${anexoIndex}`} className="media-thumb-item">
                            <MediaPreview url={anexo} alt={`Anexo ${anexoIndex + 1}`} variant="thumb" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="row">
                    <button className="btn" type="button" onClick={() => iniciarEdicao(ev)}>Editar</button>
                    {user?.perfil === "coordenador" && (
                      <button className="btn danger" type="button" onClick={() => setConfirmarExclusaoId(ev.id)}>Excluir</button>
                    )}
                  </div>
                </div>
              );
            })}
            {eventos.length === 0 && <p>Nenhum evento cadastrado.</p>}
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirmarExclusaoId !== null}
        title="Excluir evento"
        message="Voce realmente deseja excluir este evento?"
        onConfirm={() => confirmarExclusaoId !== null && void excluir(confirmarExclusaoId)}
        onCancel={() => setConfirmarExclusaoId(null)}
      />

      <ConfirmDialog
        open={confirmarRemoverMidia !== null}
        title="Remover anexo"
        message="Voce realmente deseja remover esta imagem ou video?"
        confirmLabel="Sim, remover"
        onConfirm={() => {
          if (confirmarRemoverMidia) removerMidia(confirmarRemoverMidia.url, confirmarRemoverMidia.index);
        }}
        onCancel={() => setConfirmarRemoverMidia(null)}
      />

      {conflitoMensagem !== null && (
        <div className="confirm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="conflito-evento-titulo">
          <div className="confirm-modal" style={{ textAlign: "center" }}>
            <h3 id="conflito-evento-titulo">Horario indisponivel</h3>
            <p>{conflitoMensagem}</p>
            <div className="confirm-modal-actions" style={{ justifyContent: "center" }}>
              <button className="btn" type="button" onClick={() => setConflitoMensagem(null)}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
