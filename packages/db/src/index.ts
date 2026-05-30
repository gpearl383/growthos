import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  ensureLocalDatabaseDir,
  getLocalDatabasePath,
  useLocalDatabase,
} from "./local";
import * as schema from "./schema";

let localClient: PGlite | null = null;
let remoteClient: ReturnType<typeof postgres> | null = null;

const globalForDb = globalThis as typeof globalThis & {
  __growthosLocalClient?: PGlite;
  __growthosRemoteClient?: ReturnType<typeof postgres>;
};

function getLocalClient() {
  if (!localClient) {
    localClient = globalForDb.__growthosLocalClient ?? null;
  }

  if (!localClient) {
    const path = getLocalDatabasePath();
    ensureLocalDatabaseDir(path);
    localClient = new PGlite(path);
    globalForDb.__growthosLocalClient = localClient;
  }

  return localClient;
}

function getRemoteClient(databaseUrl: string) {
  if (!remoteClient) {
    remoteClient = globalForDb.__growthosRemoteClient ?? null;
  }

  if (!remoteClient) {
    remoteClient = postgres(databaseUrl, {
      prepare: false,
      ssl: databaseUrl.includes("supabase.com") ? "require" : undefined,
    });
    globalForDb.__growthosRemoteClient = remoteClient;
  }

  return remoteClient;
}

export function createDb(databaseUrl = process.env.DATABASE_URL) {
  if (useLocalDatabase()) {
    return drizzlePglite(getLocalClient(), { schema });
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return drizzlePostgres(getRemoteClient(databaseUrl), { schema });
}

export type Db = ReturnType<typeof createDb>;

export {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  lte,
  or,
} from "drizzle-orm";

export * from "./local";
export * from "./schema";
