#!/usr/bin/env node

// Dev-only helper to flip onboarding_complete on every tenant in the local
// PGlite database. Used during testing to exercise the pre-onboarding UI gate
// without re-running the wizard. Refuses to touch a remote DATABASE_URL.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile() {
  try {
    const envPath = join(root, "apps/web/.env.local");
    const contents = readFileSync(envPath, "utf8");
    for (const line of contents.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {}
}

function getLocalDatabasePath() {
  return (
    process.env.LOCAL_DATABASE_PATH ?? join(root, ".data", "growthos")
  );
}

async function main() {
  loadEnvFile();

  const arg = process.argv[2];
  if (arg !== "true" && arg !== "false") {
    console.error("Usage: node scripts/toggle-onboarding.mjs true|false");
    process.exit(2);
  }

  const target = arg === "true";
  const path = getLocalDatabasePath();
  if (!existsSync(path)) {
    console.error(`No local database at ${path} — run pnpm db:setup first.`);
    process.exit(1);
  }

  const db = new PGlite(path);
  await db.exec(`update tenants set onboarding_complete = ${target}`);
  const result = await db.query(
    `select slug, business_name, onboarding_complete from tenants`,
  );
  await db.close();

  console.log(JSON.stringify(result.rows, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
