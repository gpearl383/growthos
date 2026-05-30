#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "packages/db/migrations");

function listMigrations() {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

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
    const envPath = join(root, "apps/web/.env.local");
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

async function applyMigrationLocal() {
  const path = getLocalDatabasePath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new PGlite(path);

  console.log(`Applying schema to local database at ${path} ...`);
  for (const file of listMigrations()) {
    const migration = readFileSync(join(migrationsDir, file), "utf8");
    try {
      await db.exec(migration);
      console.log(`  Applied ${file}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already exists")) {
        console.log(`  Skipped ${file} (already applied)`);
        continue;
      }

      throw error;
    }
  }

  await db.close();
}

async function applyMigrationRemote(databaseUrl) {
  const sql = postgres(databaseUrl, {
    prepare: false,
    ssl: databaseUrl.includes("supabase.com") ? "require" : undefined,
    max: 1,
  });

  console.log("Applying schema to remote database...");
  try {
    for (const file of listMigrations()) {
      const migration = readFileSync(join(migrationsDir, file), "utf8");
      try {
        await sql.unsafe(migration);
        console.log(`  Applied ${file}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("already exists")) {
          console.log(`  Skipped ${file} (already applied)`);
          continue;
        }

        throw error;
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  loadEnvFile();

  if (useLocalDatabase()) {
    await applyMigrationLocal();
    console.log("Local POC database ready.");
    return;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error(
      "No database configured.\n\n" +
        "For local POC: set USE_LOCAL_DB=true in apps/web/.env.local\n" +
        "For cloud: set DATABASE_URL to your Supabase/Neon connection string",
    );
    process.exit(1);
  }

  await applyMigrationRemote(databaseUrl);
  console.log("Remote database ready.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("already exists")) {
    console.log("Schema already applied — database is ready.");
    return;
  }

  console.error(`Migration failed: ${message}`);
  process.exit(1);
});
