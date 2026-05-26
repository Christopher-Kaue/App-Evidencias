"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api-fetch";
import { useFlashMessage } from "../../lib/use-flash-message";
import { AppShell } from "../components/AppShell";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { authHeaders, getSessionUser, SessionUser } from "../../lib/session";

type Item = {
  id: number;
  nome: string;
};

type SectionProps = {
  titulo: string;
  itens: Item[];
  placeholder: string;
  vazio: string;
  onAdd: (nome: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
};

function Section({ titulo, itens, placeholder, vazio, onAdd, onRemove }: SectionProps) {
  const [valor, setValor] = useState("");
  const [confirmarRemover, setConfirmarRemover] = useState<Item | null>(null);

  const handleAdd = async () => {
    const nome = valor.trim();
    if (!nome) return;
    await onAdd(nome);
    setValor("");
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{titulo}</h3>
      <div className="row">
        <input
          className="field"
          placeholder={placeholder}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleAdd();
            }
          }}
        />
        <button className="btn" type="button" onClick={() => void handleAdd()}>
          Adicionar
        </button>
      </div>
      <div className="grid" style={{ marginTop: 12 }}>
        {itens.length === 0 && <p style={{ margin: 0 }}>{vazio}</p>}
        {itens.map((i) => (
          <div
            key={i.id}
            className="list-item"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span>{i.nome}</span>
            <button className="btn danger" type="button" onClick={() => setConfirmarRemover(i)}>
              Remover
            </button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmarRemover !== null}
        title={`Remover ${titulo.toLowerCase()}`}
        message={
          confirmarRemover
            ? `Voce realmente deseja excluir "${confirmarRemover.nome}"?`
            : "Voce realmente deseja excluir?"
        }
        confirmLabel="Sim, excluir"
        onConfirm={() => {
          if (confirmarRemover) void onRemove(confirmarRemover.id);
          setConfirmarRemover(null);
        }}
        onCancel={() => setConfirmarRemover(null)}
      />
    </div>
  );
}

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  const [locais, setLocais] = useState<Item[]>([]);
  const [salas, setSalas] = useState<Item[]>([]);
  const [areas, setAreas] = useState<Item[]>([]);

  const [erro, setErro] = useState("");
  const { message: sucesso, showSuccess, clear: clearSucesso } = useFlashMessage();

  useEffect(() => {
    const session = getSessionUser();
    if (!session) {
      router.replace("/");
      return;
    }
    if (session.perfil !== "coordenador") {
      router.replace("/dashboard");
      return;
    }
    setUser(session);
  }, [router]);

  const carregar = async () => {
    const session = getSessionUser();
    if (!session) return;
    try {
      const [resLocais, resSalas, resAreas] = await Promise.all([
        apiRequest("/api/locais.php", { headers: authHeaders(session) }),
        apiRequest("/api/salas.php", { headers: authHeaders(session) }),
        apiRequest("/api/areas.php", { headers: authHeaders(session) })
      ]);
      if (resLocais.ok) setLocais((resLocais.data as Item[]) || []);
      if (resSalas.ok) setSalas((resSalas.data as Item[]) || []);
      if (resAreas.ok) setAreas((resAreas.data as Item[]) || []);
    } catch {
      setErro("Nao foi possivel carregar os dados.");
    }
  };

  useEffect(() => {
    if (user) void carregar();
  }, [user]);

  const limparMensagens = () => {
    setErro("");
    clearSucesso();
  };

  const adicionarGenerico = async (endpoint: string, nome: string, descricaoErro: string) => {
    const session = getSessionUser();
    if (!session) return;
    limparMensagens();
    try {
      const json = await apiRequest(endpoint, {
        method: "POST",
        headers: authHeaders(session),
        body: JSON.stringify({ nome })
      });
      if (!json.ok) {
        setErro((json.message || descricaoErro) + (json.detail ? ` (${json.detail})` : ""));
        return;
      }
      showSuccess();
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : descricaoErro);
    }
  };

  const removerGenerico = async (endpoint: string, id: number, descricaoErro: string) => {
    const session = getSessionUser();
    if (!session) return;
    limparMensagens();
    try {
      const json = await apiRequest(`${endpoint}?id=${id}`, {
        method: "DELETE",
        headers: authHeaders(session)
      });
      if (!json.ok) {
        setErro((json.message || descricaoErro) + (json.detail ? ` (${json.detail})` : ""));
        return;
      }
      showSuccess("Excluido com sucesso.");
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : descricaoErro);
    }
  };

  return (
    <AppShell>
      <section className="grid">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Configuracoes</h2>
          <p style={{ marginTop: 0 }}>
            Gerencie locais, salas e areas do curso utilizados no cadastro de eventos.
          </p>
          {sucesso && <p className="success-text">{sucesso}</p>}
          {erro && <p className="error-text">{erro}</p>}
        </div>

        <Section
          titulo="Locais"
          itens={locais}
          placeholder="Nome do novo local"
          vazio="Nenhum local cadastrado."
          onAdd={(nome) => adicionarGenerico("/api/locais.php", nome, "Falha ao cadastrar local.")}
          onRemove={(id) => removerGenerico("/api/locais.php", id, "Falha ao remover local.")}
        />

        <Section
          titulo="Salas"
          itens={salas}
          placeholder="Nome da nova sala"
          vazio="Nenhuma sala cadastrada."
          onAdd={(nome) => adicionarGenerico("/api/salas.php", nome, "Falha ao cadastrar sala.")}
          onRemove={(id) => removerGenerico("/api/salas.php", id, "Falha ao remover sala.")}
        />

        <Section
          titulo="Areas do curso"
          itens={areas}
          placeholder="Nome da nova area do curso"
          vazio="Nenhuma area do curso cadastrada."
          onAdd={(nome) => adicionarGenerico("/api/areas.php", nome, "Falha ao cadastrar area.")}
          onRemove={(id) => removerGenerico("/api/areas.php", id, "Falha ao remover area.")}
        />
      </section>
    </AppShell>
  );
}
