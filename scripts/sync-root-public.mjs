import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webOut = path.join(root, "frontend", "out");
const rootPublic = path.join(root, "public");

if (!fs.existsSync(webOut)) {
  console.log("sync-root-public: skip (sem frontend/out — build nao usou export)");
  process.exit(0);
}

fs.rmSync(rootPublic, { recursive: true, force: true });
fs.cpSync(webOut, rootPublic, { recursive: true });

const patch404 = spawnSync(process.execPath, ["scripts/patch-static-404.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: false
});
if (patch404.status !== 0) {
  process.exit(patch404.status ?? 1);
}

console.log("sync-root-public: copiado frontend/out -> public/ (raiz do repo)");
