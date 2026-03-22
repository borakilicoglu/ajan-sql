import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  describeTable,
  listRelationships,
  listTables,
} from "../db/schema";
import type { DbPool } from "../db/pool";

type SchemaToolDeps = {
  pool: DbPool;
};

function asTextResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

type DescribeTableArgs = {
  name: string;
  schema?: string;
};

type SqlArgs = {
  sql: string;
};

type SampleRowsArgs = {
  name: string;
  schema?: string;
  limit?: number;
};

export function registerSchemaTools(
  server: McpServer,
  deps: SchemaToolDeps,
): void {
  const registerTool = server.registerTool.bind(server) as any;

  registerTool(
    "list_tables",
    {
      description: "Return all tables in the database.",
    },
    async () => {
      const tables = await listTables(deps.pool);
      return asTextResult(tables);
    },
  );

  registerTool(
    "describe_table",
    {
      description: "Return columns and types for a given table.",
      inputSchema: {
        name: z.string().min(1),
        schema: z.string().min(1).optional(),
      },
    },
    async ({ name, schema }: DescribeTableArgs) => {
      const resolvedSchema = schema ?? "public";
      const description = await describeTable(deps.pool, name, resolvedSchema);

      if (!description) {
        throw new Error(`Table not found: ${resolvedSchema}.${name}`);
      }

      return asTextResult(description);
    },
  );

  registerTool(
    "list_relationships",
    {
      description: "Return foreign key relationships.",
    },
    async () => {
      const relationships = await listRelationships(deps.pool);
      return asTextResult(relationships);
    },
  );

  registerTool(
    "run_readonly_query",
    {
      description: "Execute a safe SELECT query.",
      inputSchema: {
        sql: z.string().min(1),
      },
    },
    async (_args: SqlArgs) => {
      throw new Error("run_readonly_query is not implemented yet");
    },
  );

  registerTool(
    "explain_query",
    {
      description: "Return query execution plan.",
      inputSchema: {
        sql: z.string().min(1),
      },
    },
    async (_args: SqlArgs) => {
      throw new Error("explain_query is not implemented yet");
    },
  );

  registerTool(
    "sample_rows",
    {
      description: "Return example rows from a table.",
      inputSchema: {
        name: z.string().min(1),
        schema: z.string().min(1).optional(),
        limit: z.number().int().positive().max(100).optional(),
      },
    },
    async (_args: SampleRowsArgs) => {
      throw new Error("sample_rows is not implemented yet");
    },
  );
}
