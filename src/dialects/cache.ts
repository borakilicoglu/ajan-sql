import type {
  RelationshipSummary,
  TableDescription,
  TableSummary,
} from "../db/schema";
import type { DatabaseDialect } from "./types";

const DEFAULT_SCHEMA_CACHE_TTL_MS = 30_000;

type SchemaCacheOptions = {
  ttlMs?: number;
};

type CacheEntry<T> = {
  expiresAt: number;
  value?: T;
  pending?: Promise<T>;
};

export function withSchemaCache(
  dialect: DatabaseDialect,
  options: SchemaCacheOptions = {},
): DatabaseDialect {
  const ttlMs = options.ttlMs ?? DEFAULT_SCHEMA_CACHE_TTL_MS;
  const tablesCache = createCache<TableSummary[]>(ttlMs);
  const relationshipsCache = createCache<RelationshipSummary[]>(ttlMs);
  const tableDescriptionCache = new Map<string, CacheEntry<TableDescription | null>>();

  return {
    ...dialect,
    listTables: () => tablesCache.get("tables", () => dialect.listTables()),
    listRelationships: () =>
      relationshipsCache.get("relationships", () => dialect.listRelationships()),
    describeTable: (name, schema) =>
      getCachedTableDescription(
        tableDescriptionCache,
        ttlMs,
        `${schema ?? "public"}:${name}`,
        () => dialect.describeTable(name, schema),
      ),
  };
}

function createCache<T>(ttlMs: number) {
  const entries = new Map<string, CacheEntry<T>>();

  return {
    async get(key: string, loader: () => Promise<T>): Promise<T> {
      return getCachedValue(entries, ttlMs, key, loader);
    },
  };
}

async function getCachedTableDescription(
  entries: Map<string, CacheEntry<TableDescription | null>>,
  ttlMs: number,
  key: string,
  loader: () => Promise<TableDescription | null>,
): Promise<TableDescription | null> {
  return getCachedValue(entries, ttlMs, key, loader);
}

async function getCachedValue<T>(
  entries: Map<string, CacheEntry<T>>,
  ttlMs: number,
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const existing = entries.get(key);

  if (existing && existing.value !== undefined && existing.expiresAt > now) {
    return existing.value;
  }

  if (existing?.pending) {
    return existing.pending;
  }

  const pending = loader()
    .then((value) => {
      entries.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    })
    .catch((error) => {
      entries.delete(key);
      throw error;
    });

  entries.set(key, {
    expiresAt: 0,
    pending,
  });

  return pending;
}
