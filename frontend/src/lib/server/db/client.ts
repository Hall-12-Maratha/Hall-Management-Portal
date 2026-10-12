/**
 * Database client - postgres.js + Drizzle, shared per process.
 *
 * - `prepare: false` is required by the Supabase transaction pooler (port 6543).
 * - The pool is cached on `globalThis` so Next.js dev HMR and serverless
 *   warm invocations reuse one connection pool instead of leaking sockets.
 * - On Vercel each function instance keeps at most one connection; local
 *   long-running processes may keep a few more.
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "../env";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

type GlobalWithDb = typeof globalThis & {
  __hmpSql?: postgres.Sql;
  __hmpDb?: Db;
};

const globalRef = globalThis as GlobalWithDb;

function isLocalHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}

/** Raw postgres.js client (for `sql` template queries). */
export function getSql(): postgres.Sql {
  if (!globalRef.__hmpSql) {
    const { DATABASE_URL } = getEnv();
    globalRef.__hmpSql = postgres(DATABASE_URL, {
      prepare: false,
      max: process.env.VERCEL ? 1 : 5,
      idle_timeout: 20,
      connect_timeout: 15,
      ssl: isLocalHost(DATABASE_URL) ? false : "require",
    });
  }
  return globalRef.__hmpSql;
}

/** Drizzle database instance bound to the shared pool. */
export function getDb(): Db {
  if (!globalRef.__hmpDb) {
    globalRef.__hmpDb = drizzle(getSql(), { schema });
  }
  return globalRef.__hmpDb;
}

export { schema };
