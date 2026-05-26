"use client";

import { FormEvent, useEffect, useState } from "react";
import { dedupeById } from "../../lib/dedupe-by-id";
import { apiRequest } from "../../lib/api-fetch";
import { useFlashMessage } from "../../lib/use-flash-message";
import { AppShell } from "../components/AppShell";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { authHeaders, getSessionUser, SessionUser } from "../../lib/session";

type Usuario = { id: number; nome: string; email?: string; celular: string; status?: "A" | "I"; perfil?: string };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [erro, setErro] = useState("");
  const { message: sucesso, showSuccess, clear: clearSucesso } = useFlashMessage();
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState<number | null>(null);

  const carregar = async () => {
    const session = getSessionUser();
    if (!session) return;
    setUser(session);
    setErro("");
    try {
      const json = await apiRequest("/api/users.php", { headers: authHeaders(session) });
      if (!json.ok) {
        setErro((json.message || "Falha ao carregar usuarios.") + (json.detail ? ` (${json.detail})` : ""));
        setUsuarios([]);
        return;
      }
      setUsuarios(dedupeById((json.data as Usuario[]) || []));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar usuarios.");
      setUsuarios([]);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const session = getSessionUser();
    if (!session || session.perfil !== "coordenador") return;
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    setErro("");
    clearSucesso();

    if (editando && typeof payload.senha === "string" && payload.senha.trim() === "") {
      delete payload.senha;
    }

    try {
      const json = await apiRequest("/api/users.php", {
        method: editando ? "PUT" : "POST",
        headers: authHeaders(session),
        body: JSON.stringify(payload)
      });
      if (!json.ok) {
        setErro((json.message || "Falha ao salvar usuario.") + (json.detail ? ` (${json.detail})` : ""));
        return;
      }

      const usuarioSalvo = (json.data as Usuario | undefined) ?? null;
      if (usuarioSalvo) {
        setUsuarios((prev) => {
          const editandoId = editando?.id;
          if (editandoId) {
            return dedupeById(prev.map((u) => (u.id === editandoId ? usuarioSalvo : u)));
          }
          return dedupeById([usuarioSalvo, ...prev.filter((u) => u.id !== usuarioSalvo.id)]);
        });
      }

      form.reset();
      showSuccess();
      setEditando(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar usuario.");
    }
  };

  const excluir = async (id: number) => {
    const session = getSessionUser();
    if (!session || session.perfil !== "coordenador") return;
    setConfirmarExclusaoId(null);
    setErro("");
    clearSucesso();
    const json = await apiRequest(`/api/users.php?id=${id}`, {
      method: "DELETE",
      headers: authHeaders(session)
    });
    if (!json.ok) {
      setErro((json.message || "Falha ao excluir usuario.") + (json.detail ? ` (${json.detail})` : ""));
      return;
    }
    await carregar();
    showSuccess("Excluido com sucesso.");
  };

  const iniciarEdicao = (usuario: Usuario) => {
    setErro("");
    clearSucesso();
    setEditando(usuario);
  };

  return (
    <AppShell>
      <section className="grid">
        {sucesso && (
          <div className="card" style={{ padding: "12px 18px" }}>
            <p className="success-text">{sucesso}</p>
          </div>
        )}
        {user?.perfil === "coordenador" && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{editando ? "Editar usuario" : "Cadastro de usuario"}</h2>
            <form key={editando?.id ?? "novo"} onSubmit={onSubmit} className="grid">
              {editando && <input type="hidden" name="id" defaultValue={editando.id} />}
              <label>Nome<input name="nome" className="field" required defaultValue={editando?.nome ?? ""} /></label>
              <label>Email<input name="email" type="email" className="field" required defaultValue={editando?.email ?? ""} /></label>
              <label>Celular<input name="celular" className="field" required defaultValue={editando?.celular ?? ""} /></label>
              {!editando && <label>Senha<input name="senha" type="password" className="field" required minLength={6} /></label>}
              {editando && (
                <label>
                  Nova senha (opcional)
                  <input
                    name="senha"
                    type="password"
                    className="field"
                    minLength={6}
                    placeholder="Deixe em branco para manter a senha atual"
                    autoComplete="new-password"
                  />
                </label>
              )}
              <label>
                Perfil
                <select name="perfil" className="field" defaultValue={editando?.perfil ?? "professor"}>
                  <option value="professor">Professor</option>
                  <option value="coordenador">Coordenador</option>
                </select>
              </label>
              {editando && (
                <label>
                  Status
                  <select name="status" className="field" defaultValue={editando?.status ?? "A"}>
                    <option value="A">Ativo</option>
                    <option value="I">Inativo</option>
                  </select>
                </label>
              )}
              <button className="btn" type="submit">{editando ? "Salvar alteracoes" : "Criar usuario"}</button>
              {erro && <p className="error-text">{erro}</p>}
            </form>
          </div>
        )}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Lista de usuarios</h2>
          {usuarios.map((u) => (
            <div key={u.id} className="list-item">
              <strong>{u.nome}</strong>
              <p style={{ margin: "6px 0" }}>
                {u.celular}
                {user?.perfil === "coordenador" && u.email ? ` | ${u.email}` : ""}
                {user?.perfil === "coordenador" && u.status ? ` | ${u.status}` : ""}
              </p>
              {user?.perfil === "coordenador" && (
                <div className="row">
                  <button className="btn" onClick={() => iniciarEdicao(u)} type="button">Editar</button>
                  <button className="btn danger" onClick={() => setConfirmarExclusaoId(u.id)} type="button">
                    Excluir
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={confirmarExclusaoId !== null}
        title="Excluir usuario"
        message="Voce realmente deseja excluir este usuario?"
        onConfirm={() => confirmarExclusaoId !== null && void excluir(confirmarExclusaoId)}
        onCancel={() => setConfirmarExclusaoId(null)}
      />
    </AppShell>
  );
}
