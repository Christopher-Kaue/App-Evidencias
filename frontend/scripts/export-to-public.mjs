import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(webRoot, "out");
const publicDir = path.join(webRoot, "public");

if (!fs.existsSync(outDir)) {
  console.log("export-to-public: skip (sem pasta out — build normal .next)");
  process.exit(0);
}

fs.rmSync(publicDir, { recursive: true, force: true });
fs.cpSync(outDir, publicDir, { recursive: true });
console.log("export-to-public: copiado out/ -> public/ (Vercel / output estatico)");
