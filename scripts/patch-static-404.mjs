import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** HTML minimo: redireciona antes do bundle React (evita flash do 404 do Next). */
const REDIRECT_404 = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta http-equiv="refresh" content="0;url=/"/>
  <title>Redirecionando...</title>
  <script>location.replace("/")</script>
</head>
<body><p style="text-align:center;margin-top:2rem">Redirecionando...</p></body>
</html>
`;

for (const dir of ["frontend/out", "public"]) {
  const file = path.join(root, dir, "404.html");
  if (!fs.existsSync(path.dirname(file))) continue;
  fs.writeFileSync(file, REDIRECT_404, "utf8");
  console.log(`patch-static-404: ${dir}/404.html -> /`);
}
