"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../../lib/api";
import { clearSessionUser, getSessionUser, SessionUser } from "../../lib/session";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: "⌂" },
  { href: "/eventos", label: "Eventos", icon: "📅" },
  { href: "/usuarios", label: "Usuarios", icon: "👥" },
  { href: "/relatorios", label: "Relatorios", icon: "📊" }
];

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [semApiUrl, setSemApiUrl] = useState(false);

  useEffect(() => {
    setSemApiUrl(!getApiBaseUrl());
  }, []);

  useEffect(() => {
    const session = getSessionUser();
    if (!session) {
      router.replace("/");
      return;
    }
    setUser(session);
  }, [router]);

  const roleLabel = useMemo(() => (user?.perfil === "coordenador" ? "Coordenador" : "Professor"), [user]);

  if (!user) return null;

  return (
    <div className="app-shell-layout">
      {semApiUrl && (
        <div className="api-config-banner" role="alert">
          <strong>URL da API nao detectada.</strong> Defina <code>NEXT_PUBLIC_API_BASE_URL</code> (Vercel ou <code>web/.env.local</code>).
          Local: <code>npm run dev:local</code> ou <code>npm run dev:api</code> com <code>web/.env.development</code>.
        </div>
      )}
      <div className="app-shell">
        <aside className="sidebar">
          <h1 className="brand">App Evidencias</h1>
          <p className="role-badge">{roleLabel}</p>
          <nav className="nav-list">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <button
            className="btn logout-btn"
            type="button"
            onClick={() => {
              clearSessionUser();
              router.replace("/");
            }}
          >
            Sair
          </button>
        </aside>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
