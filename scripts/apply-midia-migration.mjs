/**
 * Aplica database/migrations/001_midia_arquivo.sql (upload na Vercel).
 * Uso: DATABASE_URL="postgresql://..." node scripts/apply-midia-migration.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(root, "database", "migrations", "001_midia_arquivo.sql");

const uri = (process.argv[2] ?? process.env.DATABASE_URL ?? "").trim();
if (!uri) {
  console.error("Defina DATABASE_URL ou passe a connection string como argumento.");
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");
const client = new pg.Client({
  connectionString: uri,
  ssl: uri.includes("sslmode=require") || /neon\.tech|supabase\.co/i.test(uri) ? { rejectUnauthorized: true } : undefined
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Migracao midia_arquivo aplicada.");
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
