/**
 * Build de producao / Vercel (tudo dentro de `frontend/` para o upload incluir os arquivos).
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendPkg = path.join(frontendRoot, "package.json");

function runNodeScript(relPath) {
  const scriptPath = path.join(frontendRoot, relPath);
  const r = spawnSync(process.execPath, [scriptPath], {
    cwd: frontendRoot,
    stdio: "inherit",
    shell: false
  });
  if (r.error) {
    console.error("[build-production]", r.error.message);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

let nextCli;
try {
  const require = createRequire(frontendPkg);
  nextCli = require.resolve("next/dist/bin/next");
} catch {
  console.error("[build-production] Dependencias do frontend ausentes.");
  process.exit(1);
}

runNodeScript("scripts/sync-vercel-rewrite.mjs");
runNodeScript("scripts/clean-export-artifacts.mjs");

const nb = spawnSync(process.execPath, [nextCli, "build"], {
  cwd: frontendRoot,
  stdio: "inherit",
  shell: false
});
if (nb.error) {
  console.error("[build-production]", nb.error.message);
  process.exit(1);
}
if (nb.status !== 0) process.exit(nb.status ?? 1);
