import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const envOut = spawnSync(process.execPath, ["scripts/ensure-api-env.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: false
});
if (envOut.error) {
  console.error("[dev:local]", envOut.error.message);
  process.exit(1);
}
if (envOut.status !== 0) {
  process.exit(envOut.status ?? 1);
}

const phpChild = spawn(process.execPath, ["scripts/run-dev-api.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: false,
  env: process.env
});

const nextChild = spawn(process.execPath, ["scripts/run-next-cli.mjs", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell: false,
  env: process.env
});

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  nextChild.kill("SIGTERM");
  phpChild.kill("SIGTERM");
  setTimeout(() => process.exit(code), 500).unref();
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

phpChild.on("exit", (code, signal) => {
  if (!shuttingDown) {
    nextChild.kill("SIGTERM");
    process.exit(signal ? 1 : code ?? 0);
  }
});

nextChild.on("exit", (code, signal) => {
  if (!shuttingDown) {
    phpChild.kill("SIGTERM");
    process.exit(signal ? 1 : code ?? 0);
  }
});

phpChild.on("error", (err) => {
  console.error("[dev:local] PHP/API:", err.message);
  shutdown(1);
});

nextChild.on("error", (err) => {
  console.error("[dev:local] Next:", err.message);
  shutdown(1);
});
