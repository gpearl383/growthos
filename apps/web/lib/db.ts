import { createDb } from "@growthos/db";

import { dbConfigured } from "@/lib/env";

let db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!dbConfigured) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!db) {
    db = createDb();
  }

  return db;
}
