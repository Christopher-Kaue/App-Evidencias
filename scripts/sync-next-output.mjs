import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webNext = path.join(root, "web", ".next");
const rootNext = path.join(root, ".next");

if (!fs.existsSync(webNext)) {
  console.error("sync-next-output: web/.next nao existe. Rode o build do Next em web/ primeiro.");
  process.exit(1);
}

if (fs.existsSync(rootNext)) {
  fs.rmSync(rootNext, { recursive: true, force: true });
}
fs.cpSync(webNext, rootNext, { recursive: true });
console.log("sync-next-output: copiado web/.next -> .next (Vercel / monorepo)");
