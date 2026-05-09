/**
 * Aplica database/schema_postgres.sql num PostgreSQL remoto (Neon, etc.).
 * Uso: DATABASE_URL="postgresql://..." node scripts/apply-schema-postgres.mjs
 * Ou: node scripts/apply-schema-postgres.mjs "postgresql://..."
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(root, "database", "schema_postgres.sql");

const uri = (process.argv[2] ?? process.env.DATABASE_URL ?? "").trim();
if (!uri) {
  console.error("Defina DATABASE_URL ou passe a connection string como primeiro argumento.");
  process.exit(1);
}

const sql = fs.readFileSync(schemaPath, "utf8");
const client = new pg.Client({
  connectionString: uri,
  ssl: uri.includes("sslmode=require") || /neon\.tech|supabase\.co|railway\.app/i.test(uri) ? { rejectUnauthorized: true } : undefined
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema aplicado:", schemaPath);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
