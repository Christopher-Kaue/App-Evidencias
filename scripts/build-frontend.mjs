/**
 * Build local na raiz do monorepo: delega para frontend/scripts/build-production.mjs e mantem compatibilidade.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const prodScript = path.join(root, "frontend", "scripts", "build-production.mjs");

const r = spawnSync(process.execPath, [prodScript], {
  cwd: root,
  stdio: "inherit",
  shell: false
});
if (r.error) {
  console.error("[build-frontend]", r.error.message);
  process.exit(1);
}
process.exit(r.status ?? 0);
