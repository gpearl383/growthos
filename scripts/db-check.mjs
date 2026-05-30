#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, "apps/web/.env.local");

function findWorkspaceRoot(startDir = process.cwd()) {
  let dir = startDir;

  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }

    dir = dirname(dir);
  }

  return startDir;
}

function getLocalDatabasePath() {
  return process.env.LOCAL_DATABASE_PATH ?? join(findWorkspaceRoot(), ".data", "growthos");
}

function loadEnvFile() {
  try {
    const contents = readFileSync(envPath, "utf8");

    for (const line of contents.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const index = trimmed.indexOf("=");
      if (index === -1) {
        continue;
      }

      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional env file
  }
}

function hasValidDatabaseUrl(url = process.env.DATABASE_URL) {
  const value = url?.trim();
  if (!value || value.includes("[YOUR-PASSWORD]")) {
    return false;
  }

  return true;
}

function useLocalDatabase() {
  if (process.env.USE_LOCAL_DB === "true") {
    return true;
  }

  if (process.env.USE_LOCAL_DB === "false") {
    return false;
  }

  return !hasValidDatabaseUrl() && process.env.NODE_ENV !== "production";
}

async function main() {
  loadEnvFile();

  if (useLocalDatabase()) {
    const path = getLocalDatabasePath();
    const db = new PGlite(path);
    const result = await db.query(
      "select count(*)::int as tables from information_schema.tables where table_schema = 'public' and table_name = 'tenants'",
    );
    await db.close();

    if (!result.rows[0]?.tables) {
      throw new Error("tenants table not found — run pnpm db:setup");
    }

    console.log(`Local database OK (${path})`);
    return;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("No database configured. Set USE_LOCAL_DB=true for local POC.");
  }

  const sql = postgres(databaseUrl, {
    prepare: false,
    ssl: databaseUrl.includes("supabase.com") ? "require" : undefined,
    max: 1,
  });

  try {
    const [row] = await sql`
      select count(*)::int as tables
      from information_schema.tables
      where table_schema = 'public' and table_name = 'tenants'
    `;

    if (!row?.tables) {
      throw new Error("tenants table not found — run pnpm db:setup");
    }

    console.log("Remote database connection OK.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
