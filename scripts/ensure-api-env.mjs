import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiEnv = path.join(root, "backend", ".env");
const example = path.join(root, "backend", ".env.example");

if (!fs.existsSync(apiEnv) && fs.existsSync(example)) {
  fs.copyFileSync(example, apiEnv);
  console.warn("[ensure-api-env] Criado backend/.env a partir de backend/.env.example — confira DB_HOST, DB_USER e DB_PASS.");
}
