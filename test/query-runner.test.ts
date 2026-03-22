import { describe, expect, it, vi } from "vitest";

import {
  explainReadonlyQuery,
  runReadonlyQuery,
  sampleRows,
} from "../src/query-runner";

function createMockPool(rows: unknown[]) {
  const query = vi.fn(async (sql: string) => {
    if (sql === "BEGIN" || sql.startsWith("SET LOCAL") || sql === "ROLLBACK") {
      return { rows: [] };
    }

    return { rows };
  });

  const release = vi.fn();
  const connect = vi.fn().mockResolvedValue({
    query,
    release,
  });

  return {
    pool: {
      connect,
    },
    query,
    release,
    connect,
  };
}

describe("runReadonlyQuery", () => {
  it("executes a guarded select query inside readonly settings", async () => {
    const mock = createMockPool([{ id: 1, email: "ada@example.com" }]);

    const result = await runReadonlyQuery(
      mock.pool as any,
      "select id, email from users",
    );

    expect(result.rowCount).toBe(1);
    expect(result.sql).toBe("select id, email from users LIMIT 100");
    expect(mock.connect).toHaveBeenCalledTimes(1);
    expect(mock.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mock.query).toHaveBeenNthCalledWith(
      2,
      "SET LOCAL statement_timeout = '5000ms'",
    );
    expect(mock.query).toHaveBeenNthCalledWith(
      3,
      "select id, email from users LIMIT 100",
    );
    expect(mock.query).toHaveBeenNthCalledWith(4, "ROLLBACK");
    expect(mock.release).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized results", async () => {
    const mock = createMockPool([
      {
        payload: "x".repeat(1_000_001),
      },
    ]);

    await expect(
      runReadonlyQuery(mock.pool as any, "select payload from logs"),
    ).rejects.toThrow("Query result exceeds maximum allowed size of 1000000 bytes");
  });
});

describe("explainReadonlyQuery", () => {
  it("wraps a guarded query with EXPLAIN", async () => {
    const mock = createMockPool([{ "QUERY PLAN": [{ Plan: { Node: "Seq Scan" } }] }]);

    const result = await explainReadonlyQuery(
      mock.pool as any,
      "select * from users limit 5",
    );

    expect(result.sql).toBe("select * from users limit 5");
    expect(result.plan).toEqual([{ Plan: { Node: "Seq Scan" } }]);
    expect(mock.query).toHaveBeenNthCalledWith(
      3,
      "EXPLAIN (FORMAT JSON) select * from users limit 5",
    );
  });
});

describe("sampleRows", () => {
  it("builds a limited table sample query", async () => {
    const mock = createMockPool([{ id: 1 }]);

    const result = await sampleRows(mock.pool as any, "users", "public", 5);

    expect(result.sql).toBe('SELECT * FROM "public"."users" LIMIT 5');
    expect(mock.query).toHaveBeenNthCalledWith(
      3,
      'SELECT * FROM "public"."users" LIMIT 5',
    );
  });
});
