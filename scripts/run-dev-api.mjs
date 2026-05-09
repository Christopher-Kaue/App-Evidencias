import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEV_API_HOST = process.env.DEV_API_HOST || "127.0.0.1";
const _rawPort = Number.parseInt(process.env.DEV_API_PORT || "9999", 10);
const DEV_API_PORT =
  Number.isFinite(_rawPort) && _rawPort > 0 && _rawPort < 65536 ? _rawPort : 9999;

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(root, "backend");
const loginPhp = path.join(apiRoot, "api", "login.php");

if (!fs.existsSync(loginPhp)) {
  console.error("[dev:api] Pasta backend/api/login.php nao encontrada. Rode na raiz do repositorio.");
  process.exit(1);
}

function phpHasPdoPgsql(bin) {
  try {
    execFileSync(bin, ["-r", "exit(extension_loaded('pdo_pgsql') ? 0 : 1);"], {
      stdio: "ignore",
      windowsHide: true
    });
    return true;
  } catch {
    return false;
  }
}

function resolvePhpBin() {
  const phpBinEnv = process.env.PHP_BIN;
  const candidates = [];
  if (phpBinEnv) candidates.push(phpBinEnv);
  if (process.platform === "win32") {
    candidates.push("C:\\xampp\\php\\php.exe");
  }
  candidates.push("php");

  const seen = new Set();
  for (const bin of candidates) {
    if (!bin || seen.has(bin)) continue;
    seen.add(bin);
    if (bin !== "php" && !fs.existsSync(bin)) continue;
    if (!phpHasPdoPgsql(bin)) {
      if (bin === phpBinEnv) {
        console.warn("[dev:api] PHP_BIN aponta para um PHP sem pdo_pgsql; tentando outros caminhos...");
      }
      continue;
    }
    return bin;
  }

  console.error(
    "[dev:api] Nenhum PHP com extensao pdo_pgsql encontrada. Defina PHP_BIN ou habilite extension=pdo_pgsql no php.ini."
  );
  process.exit(1);
}

function probePortAvailable(host, port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, host);
  });
}

async function main() {
  if (!(await probePortAvailable(DEV_API_HOST, DEV_API_PORT))) {
    console.error(
      `[dev:api] Porta ${DEV_API_PORT} em ${DEV_API_HOST} ocupada. ` +
        "Outro processo (outro php -S nesta porta) pode responder sem PostgreSQL. Pare-o ou defina DEV_API_PORT."
    );
    process.exit(1);
  }

  const phpBin = resolvePhpBin();
  console.log(`[dev:api] PHP com pdo_pgsql: ${phpBin}`);
  const bind = `${DEV_API_HOST}:${DEV_API_PORT}`;
  const args = ["-S", bind, "-t", apiRoot];

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
}

main().catch((err) => {
  console.error("[dev:api]", err);
  process.exit(1);
});
