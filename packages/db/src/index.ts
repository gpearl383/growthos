import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  ensureLocalDatabaseDir,
  getLocalDatabasePath,
  useLocalDatabase,
} from "./local";
import * as schema from "./schema";

// Hide PGlite + drizzle-orm/pglite from Next.js's static bundler/tracer.
// We only need them in local dev (USE_LOCAL_DB), but a static `import`
// statement causes nft to trace 16+ MB of pglite into every serverless
// function on Vercel, pushing each one over the 250 MB limit. Loading
// them through an eval'd `require` keeps them out of the production
// bundle entirely.
function dynRequire<T = unknown>(spec: string): T {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-eval
  const req = eval("require") as NodeRequire;
  return req(spec) as T;
}

type PGliteCtor = new (...args: unknown[]) => unknown;
type DrizzlePgliteFn = (
  client: unknown,
  opts: { schema: typeof schema },
) => unknown;

let localClient: unknown = null;
let remoteClient: ReturnType<typeof postgres> | null = null;

const globalForDb = globalThis as typeof globalThis & {
  __growthosLocalClient?: unknown;
  __growthosRemoteClient?: ReturnType<typeof postgres>;
};

function getLocalClient() {
  if (!localClient) {
    localClient = globalForDb.__growthosLocalClient ?? null;
  }

  if (!localClient) {
    const { PGlite } = dynRequire<{ PGlite: PGliteCtor }>(
      "@electric-sql/pglite",
    );
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
    const { drizzle } = dynRequire<{ drizzle: DrizzlePgliteFn }>(
      "drizzle-orm/pglite",
    );
    return drizzle(getLocalClient(), { schema }) as ReturnType<
      typeof drizzlePostgres
    >;
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
