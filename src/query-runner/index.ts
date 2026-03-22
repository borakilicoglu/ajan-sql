import type { QueryResultRow } from "pg";

import type { DbPool } from "../db/pool";
import {
  getReadonlyDefaults,
  guardReadonlyQuery,
  quoteIdentifier,
  type ReadonlyGuardOptions,
} from "../guard";

type JsonRecord = Record<string, unknown>;

export type ReadonlyQueryResult = {
  sql: string;
  rowCount: number;
  rows: JsonRecord[];
};

export type ExplainQueryResult = {
  sql: string;
  plan: unknown;
};

export async function runReadonlyQuery(
  pool: DbPool,
  sql: string,
  options: ReadonlyGuardOptions = {},
): Promise<ReadonlyQueryResult> {
  const guarded = guardReadonlyQuery(sql, options);
  const result = await executeWithReadonlySettings(pool, guarded.sql, guarded.timeoutMs);

  assertRowCount(result.rows.length, guarded.limit);
  assertResultSize(result.rows, guarded.maxResultBytes);

  return {
    sql: guarded.sql,
    rowCount: result.rows.length,
    rows: result.rows as JsonRecord[],
  };
}

export async function explainReadonlyQuery(
  pool: DbPool,
  sql: string,
): Promise<ExplainQueryResult> {
  const guarded = guardReadonlyQuery(sql);
  const explainSql = `EXPLAIN (FORMAT JSON) ${guarded.sql}`;
  const result = await executeWithReadonlySettings(pool, explainSql, guarded.timeoutMs);
  const plan = result.rows[0]?.["QUERY PLAN"];

  return {
    sql: guarded.sql,
    plan,
  };
}

export async function sampleRows(
  pool: DbPool,
  tableName: string,
  schemaName = "public",
  limit = 10,
): Promise<ReadonlyQueryResult> {
  const defaults = getReadonlyDefaults();
  const safeLimit = Math.min(limit, defaults.maxLimit);
  const sql = [
    "SELECT *",
    `FROM ${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`,
    `LIMIT ${safeLimit}`,
  ].join(" ");

  return runReadonlyQuery(pool, sql, { defaultLimit: safeLimit });
}

async function executeWithReadonlySettings(
  pool: DbPool,
  sql: string,
  timeoutMs: number,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL statement_timeout = '${timeoutMs}ms'`);
    const result = await client.query(sql);
    await client.query("ROLLBACK");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function assertRowCount(rowCount: number, limit: number): void {
  if (rowCount > limit) {
    throw new Error(`Query returned more rows than allowed limit of ${limit}`);
  }
}

function assertResultSize(rows: QueryResultRow[], maxResultBytes: number): void {
  const resultBytes = Buffer.byteLength(JSON.stringify(rows), "utf8");

  if (resultBytes > maxResultBytes) {
    throw new Error(`Query result exceeds maximum allowed size of ${maxResultBytes} bytes`);
  }
}
