"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PptxGenJS from "pptxgenjs";
import { dedupeById } from "../../lib/dedupe-by-id";
import { apiRequest } from "../../lib/api-fetch";
import { AppShell } from "../components/AppShell";
import { authHeaders, getSessionUser, SessionUser } from "../../lib/session";
import fadergsLogo from "../assets/fadergs-logo.png";

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
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [gerandoPpt, setGerandoPpt] = useState(false);

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Falha ao converter logo para PowerPoint."));
      reader.readAsDataURL(blob);
    });

  const carregarLogoPpt = async (): Promise<string | null> => {
    try {
      const res = await fetch(fadergsLogo.src, { cache: "no-store" });
      if (!res.ok) return null;
      const blob = await res.blob();
      return await blobToDataUrl(blob);
    } catch {
      return null;
    }
  };

  const formatarDataRelatorio = (value: string): string => {
    if (!value) return "";
    return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
  };

  const carregar = async (start = dataInicial, end = dataFinal) => {
    const session = getSessionUser();
    if (!session) return;
    setUser(session);
    setErro("");
    try {
      const qs = new URLSearchParams();
      if (start) qs.set("start_date", start);
      if (end) qs.set("end_date", end);
      const path = qs.toString() ? `/api/reports.php?${qs.toString()}` : "/api/reports.php";
      const json = await apiRequest(path, { headers: authHeaders(session) });
      if (!json.ok) {
        setErro((json.message || "Falha ao carregar relatorios.") + (json.detail ? ` (${json.detail})` : ""));
        setDados(null);
        return;
      }
      const payload = json.data as Relatorio;
      setDados({ ...payload, eventos: dedupeById(payload.eventos ?? []) });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar relatorios.");
      setDados(null);
    }
  };

  useEffect(() => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const dataIni = inicioMes.toISOString().slice(0, 10);
    const dataFim = hoje.toISOString().slice(0, 10);
    setDataInicial(dataIni);
    setDataFinal(dataFim);
    void carregar(dataIni, dataFim);
  }, []);

  const gerarPowerPoint = async () => {
    if (!dados) {
      setErro("Carregue os dados do periodo antes de gerar o PowerPoint.");
      return;
    }
    setGerandoPpt(true);
    setErro("");
    try {
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";
      pptx.author = "App Evidencias";
      pptx.subject = "Relatorio mensal";
      pptx.title = "Relatorio de eventos";
      const logoData = await carregarLogoPpt();
      const periodoTexto = dataInicial || dataFinal
        ? `Periodo: ${formatarDataRelatorio(dataInicial)} ate ${formatarDataRelatorio(dataFinal)}`
        : "Periodo: todos os eventos";

      const slideCapa = pptx.addSlide();
      slideCapa.background = { color: "FFF5F6" };
      slideCapa.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.33,
        h: 1.0,
        fill: { color: "C02030" },
        line: { color: "C02030" }
      });
      slideCapa.addText("FADERGS - Centro Universitario", {
        x: 0.7,
        y: 0.22,
        w: 7.5,
        h: 0.45,
        fontSize: 16,
        bold: true,
        color: "FFFFFF"
      });
      if (logoData) {
        slideCapa.addImage({ data: logoData, x: 8.9, y: 0.1, w: 3.7, h: 0.75 });
      }
      slideCapa.addText("Relatorio Mensal de Eventos", {
        x: 0.7,
        y: 2.3,
        w: 12.0,
        h: 0.8,
        fontSize: 36,
        bold: true,
        color: "9F1725"
      });
      slideCapa.addText(periodoTexto, {
        x: 0.7,
        y: 3.2,
        w: 11.5,
        h: 0.5,
        fontSize: 16,
        color: "2A1114"
      });
      slideCapa.addText(`Emitido em ${new Date().toLocaleString("pt-BR")}`, {
        x: 0.7,
        y: 3.7,
        w: 11.5,
        h: 0.4,
        fontSize: 12,
        color: "6B2B33"
      });

      const slideResumo = pptx.addSlide();
      slideResumo.background = { color: "FFF5F6" };
      if (logoData) {
        slideResumo.addImage({ data: logoData, x: 9.5, y: 0.2, w: 3.1, h: 0.6 });
      }
      slideResumo.addText("Relatorio de Eventos", {
        x: 0.6,
        y: 0.3,
        w: 12,
        h: 0.5,
        fontSize: 28,
        bold: true,
        color: "9F1725"
      });

      slideResumo.addText(periodoTexto, { x: 0.6, y: 0.9, w: 12, h: 0.4, fontSize: 14, color: "2A1114" });

      slideResumo.addShape(pptx.ShapeType.roundRect, {
        x: 0.6, y: 1.5, w: 2.7, h: 1.2, fill: { color: "C02030" }, line: { color: "C02030" }
      });
      slideResumo.addText(`Eventos\n${dados.total_eventos}`, {
        x: 0.8, y: 1.75, w: 2.3, h: 0.9, fontSize: 18, bold: true, align: "center", color: "FFFFFF"
      });

      slideResumo.addShape(pptx.ShapeType.roundRect, {
        x: 3.6, y: 1.5, w: 2.7, h: 1.2, fill: { color: "9F1725" }, line: { color: "9F1725" }
      });
      slideResumo.addText(`Evidencias\n${dados.total_evidencias}`, {
        x: 3.8, y: 1.75, w: 2.3, h: 0.9, fontSize: 18, bold: true, align: "center", color: "FFFFFF"
      });

      slideResumo.addShape(pptx.ShapeType.roundRect, {
        x: 6.6, y: 1.5, w: 2.7, h: 1.2, fill: { color: "F8E9EC" }, line: { color: "C02030", pt: 1 }
      });
      slideResumo.addText(`Media participantes\n${dados.media_participantes}`, {
        x: 6.8, y: 1.75, w: 2.3, h: 0.9, fontSize: 14, bold: true, align: "center", color: "9F1725"
      });

      if (user?.perfil === "coordenador") {
        slideResumo.addShape(pptx.ShapeType.roundRect, {
          x: 9.6, y: 1.5, w: 2.7, h: 1.2, fill: { color: "FFFFFF" }, line: { color: "C02030", pt: 1 }
        });
        slideResumo.addText(`Usuarios\n${dados.total_usuarios}`, {
          x: 9.8, y: 1.75, w: 2.3, h: 0.9, fontSize: 16, bold: true, align: "center", color: "9F1725"
        });
      }

      const slideEventos = pptx.addSlide();
      slideEventos.background = { color: "FFFFFF" };
      if (logoData) {
        slideEventos.addImage({ data: logoData, x: 9.9, y: 0.15, w: 2.7, h: 0.5 });
      }
      slideEventos.addText("Eventos do periodo", {
        x: 0.6, y: 0.3, w: 12, h: 0.5, fontSize: 22, bold: true, color: "9F1725"
      });

      const headerStyle = { bold: true, color: "FFFFFF", fontSize: 12, align: "center" as const };
      const bodyStyle = { color: "2A1114", fontSize: 11, align: "left" as const };
      const rows = dados.eventos.slice(0, 18);

      slideEventos.addShape(pptx.ShapeType.rect, { x: 0.6, y: 1.0, w: 12.0, h: 0.45, fill: { color: "C02030" }, line: { color: "C02030" } });
      slideEventos.addText("Data", { x: 0.65, y: 1.08, w: 2.1, h: 0.25, ...headerStyle });
      slideEventos.addText("Nome", { x: 2.8, y: 1.08, w: 4.0, h: 0.25, ...headerStyle });
      slideEventos.addText("Local/Sala", { x: 6.9, y: 1.08, w: 3.2, h: 0.25, ...headerStyle });
      slideEventos.addText("Participantes", { x: 10.2, y: 1.08, w: 2.2, h: 0.25, ...headerStyle });

      rows.forEach((evento, idx) => {
        const y = 1.48 + idx * 0.37;
        const zebra = idx % 2 === 0 ? "FFF6F7" : "FFFFFF";
        slideEventos.addShape(pptx.ShapeType.rect, { x: 0.6, y, w: 12.0, h: 0.35, fill: { color: zebra }, line: { color: "F2C0C7", pt: 0.5 } });
        slideEventos.addText(new Date(evento.data).toLocaleDateString("pt-BR"), { x: 0.65, y: y + 0.07, w: 2.1, h: 0.2, ...bodyStyle });
        slideEventos.addText(evento.nome, { x: 2.8, y: y + 0.07, w: 4.0, h: 0.2, ...bodyStyle });
        slideEventos.addText(`${evento.local} / ${evento.sala}`, { x: 6.9, y: y + 0.07, w: 3.2, h: 0.2, ...bodyStyle });
        slideEventos.addText(String(evento.qtdparticipantes), { x: 10.9, y: y + 0.07, w: 0.8, h: 0.2, ...bodyStyle, align: "center" });
      });

      const sufixo = `${(dataInicial || "inicio").replaceAll("-", "")}-${(dataFinal || "fim").replaceAll("-", "")}`;
      await pptx.writeFile({ fileName: `relatorio-mensal-${sufixo}.pptx` });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar PowerPoint.");
    } finally {
      setGerandoPpt(false);
    }
  };

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
          <div className="row" style={{ alignItems: "end" }}>
            <label>
              Data inicial
              <input type="date" className="field" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
            </label>
            <label>
              Data final
              <input type="date" className="field" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
            </label>
            <button className="btn" type="button" onClick={() => void carregar()}>
              Aplicar filtro
            </button>
            <button className="btn" type="button" disabled={gerandoPpt || !dados} onClick={() => void gerarPowerPoint()}>
              {gerandoPpt ? "Gerando PPT..." : "Gerar PowerPoint"}
            </button>
          </div>
          {!dados && !erro && <p>Carregando...</p>}
          {erro ? <p className="error-text">{erro}</p> : null}
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
          {!dados && erro ? (
            <p style={{ margin: "8px 0 0", color: "#6b2b33", fontSize: 14 }}>
              Os eventos do periodo aparecem aqui quando a API responder.
            </p>
          ) : null}
          {!erro && dados && dados.eventos.length === 0 ? (
            <p style={{ margin: "8px 0 0", color: "#6b2b33", fontSize: 14 }}>Nenhum evento no periodo selecionado.</p>
          ) : null}
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
