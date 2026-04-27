import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(root, "api");
const loginPhp = path.join(apiRoot, "api", "login.php");

if (!fs.existsSync(loginPhp)) {
  console.error("[dev:api] Pasta api/api/login.php nao encontrada. Rode na raiz do repositorio.");
  process.exit(1);
}

function resolvePhpBin() {
  if (process.env.PHP_BIN) return process.env.PHP_BIN;
  if (process.platform === "win32") {
    const xampp = "C:\\xampp\\php\\php.exe";
    if (fs.existsSync(xampp)) return xampp;
  }
  return "php";
}

const phpBin = resolvePhpBin();
const args = ["-S", "127.0.0.1:9999", "-t", apiRoot];

const child = spawn(phpBin, args, {
  stdio: "inherit",
  cwd: root,
  shell: false,
  env: process.env
});

child.on("error", (err) => {
  console.error(
    `[dev:api] Falha ao iniciar PHP (${phpBin}). Adicione PHP ao PATH ou defina PHP_BIN (ex.: C:\\xampp\\php\\php.exe).\n`,
    err.message
  );
  process.exit(1);
});

child.on("exit", (code) => process.exit(code ?? 0));
