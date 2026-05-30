import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function findWorkspaceRoot() {
  if (process.env.GROWTHOS_ROOT) {
    return process.env.GROWTHOS_ROOT;
  }

  // packages/db/src/local.ts → repo root (works regardless of process.cwd())
  const packageSrcDir = dirname(fileURLToPath(import.meta.url));
  const fromPackage = join(packageSrcDir, "..", "..", "..");
  if (existsSync(join(fromPackage, "pnpm-workspace.yaml"))) {
    return fromPackage;
  }

  let dir = process.cwd();

  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }

    dir = dirname(dir);
  }

  return process.cwd();
}

export function hasValidDatabaseUrl(url = process.env.DATABASE_URL) {
  const value = url?.trim();
  if (!value) {
    return false;
  }

  if (value.includes("[YOUR-PASSWORD]")) {
    return false;
  }

  return true;
}

export function useLocalDatabase() {
  if (process.env.USE_LOCAL_DB === "true") {
    return true;
  }

  if (process.env.USE_LOCAL_DB === "false") {
    return false;
  }

  if (hasValidDatabaseUrl()) {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

export function getLocalDatabasePath() {
  if (process.env.LOCAL_DATABASE_PATH) {
    return process.env.LOCAL_DATABASE_PATH;
  }

  return join(findWorkspaceRoot(), ".data", "growthos");
}

export function ensureLocalDatabaseDir(path = getLocalDatabasePath()) {
  mkdirSync(dirname(path), { recursive: true });
}
