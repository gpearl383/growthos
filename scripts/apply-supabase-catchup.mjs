#!/usr/bin/env node
// One-shot helper: applies scripts/supabase-catchup-migrations.sql against
// whatever connection string is passed in $DATABASE_URL. Reuses the
// postgres-js client we already depend on so it works without installing
// psql locally.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const postgres = require("postgres");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — refusing to run.");
  process.exit(1);
}

const sqlPath = join(here, "supabase-catchup-migrations.sql");
const sqlText = await readFile(sqlPath, "utf8");

// Run as a single batch via .unsafe(). prepare:false because pooled Supabase
// connections (port 6543 pgBouncer) don't support prepared statements.
const sql = postgres(url, {
  prepare: false,
  ssl: url.includes("supabase.com") ? "require" : undefined,
});

try {
  console.log("Connecting to:", url.replace(/:[^:@]+@/, ":***@"));
  console.log("Running catch-up migrations…");
  await sql.unsafe(sqlText);
  console.log("✅ Migrations applied successfully.");

  const cols = await sql`
    select column_name
    from information_schema.columns
    where table_schema = 'public' and table_name = 'tenants'
    order by ordinal_position;
  `;
  console.log("\ntenants columns now:");
  for (const row of cols) console.log("  -", row.column_name);

  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name;
  `;
  console.log("\npublic tables:");
  for (const row of tables) console.log("  -", row.table_name);
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
