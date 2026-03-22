const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const MAX_TIMEOUT_MS = 5_000;
const MAX_RESULT_BYTES = 1_000_000;

const BLOCKED_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "drop",
  "alter",
  "truncate",
];

export type GuardedReadonlyQuery = {
  sql: string;
  limit: number;
  timeoutMs: number;
  maxResultBytes: number;
};

export type ReadonlyGuardOptions = {
  defaultLimit?: number;
  maxLimit?: number;
  timeoutMs?: number;
  maxResultBytes?: number;
};

export function getReadonlyDefaults() {
  return {
    defaultLimit: DEFAULT_LIMIT,
    maxLimit: MAX_LIMIT,
    timeoutMs: MAX_TIMEOUT_MS,
    maxResultBytes: MAX_RESULT_BYTES,
  };
}

export function guardReadonlyQuery(
  sql: string,
  options: ReadonlyGuardOptions = {},
): GuardedReadonlyQuery {
  const defaults = getReadonlyDefaults();
  const defaultLimit = options.defaultLimit ?? defaults.defaultLimit;
  const maxLimit = options.maxLimit ?? defaults.maxLimit;
  const timeoutMs = Math.min(options.timeoutMs ?? defaults.timeoutMs, defaults.timeoutMs);
  const maxResultBytes = options.maxResultBytes ?? defaults.maxResultBytes;

  const normalizedSql = normalizeSql(sql);

  assertSingleStatement(normalizedSql);
  assertNoSqlComments(normalizedSql);
  assertSelectOnly(normalizedSql);
  assertNoBlockedKeywords(normalizedSql);

  const limitMatch = normalizedSql.match(/\blimit\s+(\d+)\b/i);
  const parsedLimit = limitMatch ? Number.parseInt(limitMatch[1], 10) : null;

  if (parsedLimit !== null && parsedLimit > maxLimit) {
    throw new Error(`Query LIMIT exceeds maximum allowed value of ${maxLimit}`);
  }

  return {
    sql: parsedLimit === null ? `${normalizedSql} LIMIT ${defaultLimit}` : normalizedSql,
    limit: parsedLimit ?? defaultLimit,
    timeoutMs,
    maxResultBytes,
  };
}

export function quoteIdentifier(identifier: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }

  return `"${identifier.replace(/"/g, "\"\"")}"`;
}

function normalizeSql(sql: string): string {
  const trimmed = sql.trim().replace(/;+$/, "").trim();

  if (!trimmed) {
    throw new Error("SQL query is required");
  }

  return trimmed;
}

function assertSingleStatement(sql: string): void {
  if (sql.includes(";")) {
    throw new Error("Only a single SQL statement is allowed");
  }
}

function assertNoSqlComments(sql: string): void {
  if (sql.includes("--") || sql.includes("/*") || sql.includes("*/")) {
    throw new Error("SQL comments are not allowed");
  }
}

function assertSelectOnly(sql: string): void {
  if (!/^select\b/i.test(sql)) {
    throw new Error("Only SELECT queries are allowed");
  }
}

function assertNoBlockedKeywords(sql: string): void {
  const scrubbedSql = sql.replace(/'(?:''|[^'])*'/g, "''");

  for (const keyword of BLOCKED_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`, "i");

    if (pattern.test(scrubbedSql)) {
      throw new Error(`Blocked SQL keyword detected: ${keyword.toUpperCase()}`);
    }
  }
}
