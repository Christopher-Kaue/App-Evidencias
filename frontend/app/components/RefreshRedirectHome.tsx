"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * No deploy estático (Vercel), F5 em rotas internas pode falhar ou exibir 404.
 * Ao recarregar qualquer rota autenticada, volta ao login (/) — a sessão redireciona de volta ao painel.
 */
export function RefreshRedirectHome() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/") return;
    if (!process.env.NEXT_PUBLIC_VERCEL_ENV) return;

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === "reload") {
      router.replace("/");
    }
  }, [pathname, router]);

  return null;
}
