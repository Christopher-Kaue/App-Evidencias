import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const webOut = path.join(root, "web", "out");
const rootPublic = path.join(root, "public");

if (!fs.existsSync(webOut)) {
  console.log("sync-root-public: skip (sem web/out — build nao usou export)");
  process.exit(0);
}

fs.rmSync(rootPublic, { recursive: true, force: true });
fs.cpSync(webOut, rootPublic, { recursive: true });
console.log("sync-root-public: copiado web/out -> public/ (raiz do repo)");
