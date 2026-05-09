import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendRoot = path.join(root, "frontend");
const frontendPkg = path.join(frontendRoot, "package.json");

const cmdArgs = process.argv.slice(2);
if (cmdArgs.length === 0) {
  console.error("Uso: node scripts/run-next-cli.mjs <dev|build|start|lint> [...]");
  process.exit(1);
}

let nextCli;
try {
  const require = createRequire(frontendPkg);
  nextCli = require.resolve("next/dist/bin/next");
} catch {
  console.error("[next-cli] Instale dependencias: npm install na raiz do repositorio.");
  process.exit(1);
}

const child = spawn(process.execPath, [nextCli, ...cmdArgs], {
  cwd: frontendRoot,
  stdio: "inherit",
  shell: false,
  env: process.env
});

child.on("error", (err) => {
  console.error("[next-cli]", err.message);
  process.exit(1);
});

child.on("exit", (code) => process.exit(code ?? 0));
