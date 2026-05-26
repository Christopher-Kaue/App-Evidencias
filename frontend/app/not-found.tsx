"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Rotas inexistentes no export estático: redireciona ao login em vez de exibir 404. */
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return <p style={{ textAlign: "center", marginTop: "2rem" }}>Redirecionando...</p>;
}
