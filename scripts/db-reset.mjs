#!/usr/bin/env node
/**
 * Reset the local PGlite database for the POC. Archives the current data dir
 * (instead of deleting) so you can recover from accidents, then re-applies
 * every migration so the dev server boots into a clean schema.
 *
 * Refuses to touch anything if DATABASE_URL or USE_LOCAL_DB=false is set —
 * we never want this to vaporize a real remote database.
 *
 * Usage:
 *   pnpm db:reset            # archive .data/growthos -> .data/growthos.archived-<ts>
 *   pnpm db:reset --hard     # rm -rf .data/growthos (no archive)
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dataDir = join(root, ".data", "growthos");

function loadEnvFile() {
  try {
    const contents = readFileSync(join(root, "apps/web/.env.local"), "utf8");
    for (const line of contents.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional
  }
}

function isUsingRemoteDatabase() {
  if (process.env.USE_LOCAL_DB === "true") return false;
  if (process.env.USE_LOCAL_DB === "false") return true;

  const url = process.env.DATABASE_URL?.trim();
  if (!url) return false;
  if (url.includes("[YOUR-PASSWORD]")) return false;
  return true;
}

function main() {
  loadEnvFile();

  if (isUsingRemoteDatabase()) {
    console.error(
      "Refusing to reset: DATABASE_URL points at a remote database.\n" +
        "This script only resets the local PGlite POC database.",
    );
    process.exit(1);
  }

  const hard = process.argv.includes("--hard");

  if (!existsSync(dataDir)) {
    console.log("No local database found at", dataDir);
  } else if (hard) {
    rmSync(dataDir, { recursive: true, force: true });
    console.log("Removed", dataDir);
  } else {
    const archive = `${dataDir}.archived-${Date.now()}`;
    renameSync(dataDir, archive);
    console.log("Archived previous database to", archive);
    console.log("(Use `pnpm db:reset --hard` next time to skip the archive.)");
  }

  // Re-apply every migration so the dev server starts on a fresh schema.
  execSync("node scripts/migrate.mjs", { cwd: root, stdio: "inherit" });

  console.log("\nLocal database reset complete.");
  console.log("Restart the dev server to pick up the new database.");
}

main();
