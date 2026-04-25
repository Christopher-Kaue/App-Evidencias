"use client";

/**
 * Deve ser Client Component e usar estilos inline (sem importar globals.css).
 * Evita falha de pre-render do Next 16.0.x em /_global-error (workUnitAsyncStorage).
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", padding: 24, background: "#f8fafc", color: "#0f172a" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Erro inesperado</h1>
        <p style={{ color: "#64748b", maxWidth: 480 }}>{error.message || "Ocorreu um problema ao carregar a aplicacao."}</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: 16,
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            background: "#0f172a",
            color: "#fff"
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
