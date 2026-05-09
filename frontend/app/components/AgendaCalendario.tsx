"use client";

import { useEffect, useMemo, useState } from "react";
import { dedupeById } from "../../lib/dedupe-by-id";
import { apiRequest } from "../../lib/api-fetch";
import { authHeaders, getSessionUser } from "../../lib/session";

type Evento = {
  id: number;
  nome: string;
  data: string;
  local: string;
  sala: string;
  idareacurso?: number | null;
};

type AreaCurso = {
  id: number;
  nome: string;
};

const MESES = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

const DIAS_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

const PALETA_AREAS = [
  "#c02030", "#1f7a3b", "#1f4f9f", "#b8531d",
  "#6a1b8a", "#0e6a78", "#7a5318", "#983b6e",
  "#2a3d66", "#4a7a25", "#b21458", "#4d4d4f"
];

const COR_PADRAO = "#2a1114";

export const corDaArea = (idarea?: number | null): string => {
  if (!idarea) return COR_PADRAO;
  return PALETA_AREAS[Math.abs(idarea) % PALETA_AREAS.length];
};

/** ISO ou "YYYY-MM-DD HH:mm:ss" vindo da API. */
const parseDataEvento = (data: string): Date | null => {
  if (!data) return null;
  const normalizada = data.replace(" ", "T");
  const dt = new Date(normalizada);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
};

const padInt = (valor: number) => String(valor).padStart(2, "0");

type CelulaDia = {
  data: Date;
  noMes: boolean;
  hoje: boolean;
};

const construirGradeMes = (ano: number, mes: number): CelulaDia[] => {
  const primeiroDia = new Date(ano, mes, 1);
  const inicioGrade = new Date(primeiroDia);
  inicioGrade.setDate(1 - primeiroDia.getDay());

  const celulas: CelulaDia[] = [];
  const hoje = new Date();
  const hojeKey = `${hoje.getFullYear()}-${hoje.getMonth()}-${hoje.getDate()}`;

  for (let i = 0; i < 42; i++) {
    const data = new Date(inicioGrade);
    data.setDate(inicioGrade.getDate() + i);
    const key = `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
    celulas.push({
      data,
      noMes: data.getMonth() === mes,
      hoje: key === hojeKey
    });
  }
  return celulas;
};

export function AgendaCalendario() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [areas, setAreas] = useState<AreaCurso[]>([]);

  const carregar = async () => {
    const session = getSessionUser();
    if (!session) return;
    try {
      const [resEventos, resAreas] = await Promise.all([
        apiRequest("/api/events.php", { headers: authHeaders(session) }),
        apiRequest("/api/areas.php", { headers: authHeaders(session) })
      ]);
      if (resEventos.ok) setEventos(dedupeById((resEventos.data as Evento[]) || []));
      if (resAreas.ok) setAreas((resAreas.data as AreaCurso[]) || []);
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    void carregar();
    const aoFocar = () => void carregar();
    window.addEventListener("focus", aoFocar);
    return () => window.removeEventListener("focus", aoFocar);
  }, []);

  const eventosNoMes = useMemo(() => {
    return eventos.filter((ev) => {
      const dt = parseDataEvento(ev.data);
      if (!dt) return false;
      return dt.getFullYear() === ano && dt.getMonth() === mes;
    });
  }, [eventos, ano, mes]);

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>();
    eventosNoMes.forEach((ev) => {
      const dt = parseDataEvento(ev.data);
      if (!dt) return;
      const chave = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
      const lista = mapa.get(chave) ?? [];
      lista.push(ev);
      mapa.set(chave, lista);
    });
    mapa.forEach((lista) => lista.sort((a, b) => {
      const da = parseDataEvento(a.data)?.getTime() ?? 0;
      const db = parseDataEvento(b.data)?.getTime() ?? 0;
      return da - db;
    }));
    return mapa;
  }, [eventosNoMes]);

  const grade = useMemo(() => construirGradeMes(ano, mes), [ano, mes]);

  const irMesAnterior = () => {
    if (mes === 0) {
      setMes(11);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  };

  const irMesSeguinte = () => {
    if (mes === 11) {
      setMes(0);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  };

  const irHoje = () => {
    const agora = new Date();
    setAno(agora.getFullYear());
    setMes(agora.getMonth());
  };

  const anoAtual = hoje.getFullYear();
  const anosDisponiveis: number[] = [];
  for (let a = anoAtual - 5; a <= anoAtual + 5; a++) anosDisponiveis.push(a);

  const areasUtilizadas = useMemo(() => {
    const ids = new Set<number>();
    eventosNoMes.forEach((ev) => {
      if (ev.idareacurso) ids.add(ev.idareacurso);
    });
    return Array.from(ids)
      .map((id) => areas.find((a) => a.id === id))
      .filter((a): a is AreaCurso => Boolean(a));
  }, [eventosNoMes, areas]);

  return (
    <div className="calendar-card">
      <div className="calendar-header">
        <h2 className="calendar-title">AGENDA</h2>
        <div className="calendar-nav">
          <button type="button" onClick={irMesAnterior} aria-label="Mes anterior">{"<<"}</button>
          <select className="field" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {MESES.map((nome, idx) => (
              <option key={nome} value={idx}>{nome}</option>
            ))}
          </select>
          <select className="field" value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            {anosDisponiveis.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button type="button" onClick={irMesSeguinte} aria-label="Proximo mes">{">>"}</button>
          <button type="button" className="calendar-go" onClick={irHoje}>Hoje</button>
        </div>
      </div>

      <p className="calendar-total">Total Agendamentos no mes: {eventosNoMes.length}</p>

      <div className="calendar-grid">
        {DIAS_SEMANA.map((dia) => (
          <div key={dia} className="calendar-weekday">{dia}</div>
        ))}
        {grade.map((celula) => {
          const chave = `${celula.data.getFullYear()}-${celula.data.getMonth()}-${celula.data.getDate()}`;
          const lista = eventosPorDia.get(chave) ?? [];
          const classes = ["calendar-cell"];
          if (!celula.noMes) classes.push("is-other-month");
          if (celula.hoje) classes.push("is-today");
          return (
            <div key={chave} className={classes.join(" ")}>
              <div className="calendar-cell-day">
                <span className="calendar-cell-day-name">{DIAS_SEMANA[celula.data.getDay()]}</span>
                <span className="calendar-cell-day-number">{padInt(celula.data.getDate())}</span>
              </div>
              {lista.map((ev, idx) => {
                const dt = parseDataEvento(ev.data);
                const hora = dt ? `${padInt(dt.getHours())}:${padInt(dt.getMinutes())}` : "";
                const cor = corDaArea(ev.idareacurso);
                const localTexto = [ev.local, ev.sala].filter(Boolean).join(" - ");
                return (
                  <div key={`${chave}-${ev.id}-${idx}`} className="calendar-event" style={{ background: cor }} title={ev.nome}>
                    {hora && <span className="calendar-event-time">{hora}</span>}
                    <span className="calendar-event-title">{ev.nome}</span>
                    {localTexto && <span className="calendar-event-place">{localTexto}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {areasUtilizadas.length > 0 && (
        <div className="calendar-legend">
          {areasUtilizadas.map((area) => (
            <span key={area.id} className="calendar-legend-item">
              <span className="calendar-legend-color" style={{ background: corDaArea(area.id) }} />
              {area.nome}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
