import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const DEFAULT_DB_TIMEOUT_MS = 8000;

function getDbTimeoutMs() {
  const raw = Number.parseInt(process.env.DATABASE_TIMEOUT_MS ?? '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DB_TIMEOUT_MS;
}

function createDb() {
  const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não foi configurada.');
  }

  neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
    const signal = AbortSignal.timeout(getDbTimeoutMs());
    return fetch(input, { ...init, signal });
  };

  return drizzle(neon(databaseUrl), { schema });
}

let cachedDb: ReturnType<typeof createDb> | null = null;

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop, receiver) {
    cachedDb ??= createDb();
    return Reflect.get(cachedDb, prop, receiver);
  },
});
