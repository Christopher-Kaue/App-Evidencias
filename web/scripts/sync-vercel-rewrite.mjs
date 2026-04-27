import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * No build do Next na Vercel, ajusta web/vercel.json para /api-proxy apontar
 * ao URL do teu projeto PHP (o ficheiro e re-gerado no worker, nao fica no teu PC apos build local).
 */
const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const vercelJsonPath = path.join(webRoot, "vercel.json");

const raw =
  (process.env.NEXT_PUBLIC_VERCEL_PHP_ORIGIN ?? "").trim() ||
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim() ||
  (process.env.VERCEL_PHP_ORIGIN ?? "").trim();

if (!process.env.VERCEL) {
  process.exit(0);
}

if (!raw) {
  console.error(
    "[sync-vercel-rewrite] No projeto Web na Vercel defina NEXT_PUBLIC_API_BASE_URL\n" +
      "(URL base do projeto PHP, ex.: https://teu-php.vercel.app sem barra final).\n" +
      "Opcionalmente NEXT_PUBLIC_VERCEL_PHP_ORIGIN ou VERCEL_PHP_ORIGIN.\n" +
      "Salve no painel e redeploy."
  );
  process.exit(1);
}

let base = raw.replace(/\/+$/, "");
if (!/^https?:\/\//i.test(base)) {
  base = `https://${base}`;
}

const destination = `${base}/api/:path*`;

const json = JSON.parse(fs.readFileSync(vercelJsonPath, "utf8"));
const rewrite = json.rewrites?.find((w) => w.source === "/api-proxy/:path*");
if (!rewrite) {
  console.error("[sync-vercel-rewrite] Falta rewrite /api-proxy/:path* em vercel.json.");
  process.exit(1);
}

rewrite.destination = destination;
fs.writeFileSync(vercelJsonPath, `${JSON.stringify(json, null, 2)}\n`);
console.log("[sync-vercel-rewrite] destination ->", destination);
