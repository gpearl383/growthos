#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, "apps/web/.env.local"), "utf8")
    .split("\n")
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);

const sql = postgres(env.DATABASE_URL, {
  prepare: false,
  ssl: "require",
  max: 1,
});

try {
  console.log("=== tenants ===");
  const tenants = await sql`select id, clerk_org_id, slug, business_name, business_type, goal, offer_text, website_url, onboarding_complete, plan, created_at from tenants order by created_at desc`;
  console.log(JSON.stringify(tenants, null, 2));

  for (const table of ["lead_pages", "auto_reply_presets", "brand_assets"]) {
    console.log(`\n=== ${table} ===`);
    try {
      const cols = await sql`
        select column_name from information_schema.columns
        where table_schema='public' and table_name=${table}
        order by ordinal_position
      `;
      console.log("columns:", cols.map((c) => c.column_name).join(", "));
      const count = await sql`select count(*)::int as n from ${sql(table)}`;
      console.log("row count:", count[0].n);
      const sample = await sql`select * from ${sql(table)} limit 3`;
      console.log("sample:", JSON.stringify(sample, null, 2));
    } catch (e) {
      console.log("error:", e.message);
    }
  }
} finally {
  await sql.end();
}
