import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * No build do Next na Vercel, ajusta frontend/vercel.json para /api-proxy apontar
 * ao URL do teu projeto PHP (o ficheiro e re-gerado no worker, nao fica no teu PC apos build local).
 */
const frontendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.join(frontendRoot, "..");
const vercelJsonPaths = [
  path.join(frontendRoot, "vercel.json"),
  path.join(repoRoot, "vercel.json")
];

const raw =
  (process.env.NEXT_PUBLIC_VERCEL_PHP_ORIGIN ?? "").trim() ||
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim() ||
  (process.env.VERCEL_PHP_ORIGIN ?? "").trim();

if (!process.env.VERCEL) {
  process.exit(0);
}

if (!raw) {
  console.warn(
    "[sync-vercel-rewrite] Sem NEXT_PUBLIC_API_BASE_URL / NEXT_PUBLIC_VERCEL_PHP_ORIGIN / VERCEL_PHP_ORIGIN.\n" +
      "Mantendo o destination atual em vercel.json (commit ou valor anterior no build).\n" +
      "Para apontar o proxy /api-proxy ao projeto PHP pela UI da Vercel, defina NEXT_PUBLIC_API_BASE_URL e redeploy."
  );
  process.exit(0);
}

let base = raw.replace(/\/+$/, "");
if (!/^https?:\/\//i.test(base)) {
  base = `https://${base}`;
}

const destination = `${base}/api/:path*`;

for (const vercelJsonPath of vercelJsonPaths) {
  if (!fs.existsSync(vercelJsonPath)) continue;
  const json = JSON.parse(fs.readFileSync(vercelJsonPath, "utf8"));
  const rewrite = json.rewrites?.find((w) => w.source === "/api-proxy/:path*");
  if (!rewrite) {
    console.error(`[sync-vercel-rewrite] Falta rewrite /api-proxy/:path* em ${path.relative(repoRoot, vercelJsonPath)}.`);
    process.exit(1);
  }
  rewrite.destination = destination;
  fs.writeFileSync(vercelJsonPath, `${JSON.stringify(json, null, 2)}\n`);
  console.log("[sync-vercel-rewrite]", path.relative(repoRoot, vercelJsonPath), "destination ->", destination);
}
