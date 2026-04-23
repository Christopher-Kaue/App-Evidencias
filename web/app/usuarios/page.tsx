"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiUrl } from "../../lib/api";
import { AppShell } from "../components/AppShell";
import { authHeaders, getSessionUser, SessionUser } from "../../lib/session";

type Usuario = { id: number; nome: string; email?: string; celular: string; status?: "A" | "I"; perfil?: string };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [erro, setErro] = useState("");

  const carregar = async () => {
    const session = getSessionUser();
    if (!session) return;
    setUser(session);
    const res = await fetch(apiUrl("/api/users.php"), { headers: authHeaders(session) });
    const json = await res.json();
    setUsuarios(json.data || []);
  };

  useEffect(() => {
    carregar().catch(() => setErro("Falha ao carregar usuarios."));
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const session = getSessionUser();
    if (!session || session.perfil !== "coordenador") return;
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    const res = await fetch(apiUrl("/api/users.php"), {
      method: editando ? "PUT" : "POST",
      headers: authHeaders(session),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      setErro(json.message || "Falha ao salvar usuario.");
      return;
    }
    e.currentTarget.reset();
    setEditando(null);
    await carregar();
  };

  const excluir = async (id: number) => {
    const session = getSessionUser();
    if (!session || session.perfil !== "coordenador") return;
    const res = await fetch(apiUrl(`/api/users.php?id=${id}`), {
      method: "DELETE",
      headers: authHeaders(session)
    });
    if (!res.ok) {
      const json = await res.json();
      setErro(json.message || "Falha ao excluir usuario.");
      return;
    }
    await carregar();
  };

  return (
    <AppShell>
      <section className="grid">
        {user?.perfil === "coordenador" && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{editando ? "Editar usuario" : "Cadastro de usuario"}</h2>
            <form onSubmit={onSubmit} className="grid">
              {editando && <input type="hidden" name="id" defaultValue={editando.id} />}
              <label>Nome<input name="nome" className="field" required defaultValue={editando?.nome ?? ""} /></label>
              <label>Email<input name="email" type="email" className="field" required defaultValue={editando?.email ?? ""} /></label>
              <label>Celular<input name="celular" className="field" required defaultValue={editando?.celular ?? ""} /></label>
              {!editando && <label>Senha<input name="senha" type="password" className="field" required /></label>}
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
                  <button className="btn" onClick={() => setEditando(u)} type="button">Editar</button>
                  <button className="btn danger" onClick={() => excluir(u.id)} type="button">Excluir</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
