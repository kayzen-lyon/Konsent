#!/usr/bin/env node
/**
 * Applique db/schema.sql à la base désignée par DATABASE_URL.
 *
 * Le schéma est idempotent : le rejouer ne casse rien. Usage :
 *   npx dotenv -e .env.local -- npm run db:schema
 * ou, la variable étant déjà dans l'environnement :
 *   npm run db:schema
 */
import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL absente.");
  process.exit(1);
}

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const pool = new Pool({ connectionString: url });
try {
  await pool.query(schema);
  const { rows } = await pool.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by 1",
  );
  console.log(`✓ Schéma appliqué. Tables : ${rows.map((r) => r.table_name).join(", ")}`);
} catch (error) {
  console.error("✗ Échec :", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
