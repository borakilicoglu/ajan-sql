import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  describeTable,
  listRelationships,
  listTables,
} from "../db/schema";
import type { DbPool } from "../db/pool";

type SchemaResourceDeps = {
  pool: DbPool;
};

export function registerSchemaResources(
  server: McpServer,
  deps: SchemaResourceDeps,
): void {
  server.registerResource(
    "schema-snapshot",
    "schema://snapshot",
    {
      description: "Snapshot of tables and foreign key relationships.",
      mimeType: "application/json",
    },
    async (uri) => {
      const [tables, relationships] = await Promise.all([
        listTables(deps.pool),
        listRelationships(deps.pool),
      ]);

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({ tables, relationships }, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    },
  );

  server.registerResource(
    "schema-table",
    new ResourceTemplate("schema://table/{name}", {
      list: async () => {
        const tables = await listTables(deps.pool);

        return {
          resources: tables.map((table) => ({
            uri: `schema://table/${table.name}`,
            name: `${table.schema}.${table.name}`,
          })),
        };
      },
      complete: {
        name: async (value) => {
          const tables = await listTables(deps.pool);

          return tables
            .map((table) => table.name)
            .filter((tableName) => tableName.startsWith(value));
        },
      },
    }),
    {
      description: "Schema details for a single table.",
      mimeType: "application/json",
    },
    async (uri, params) => {
      const tableName = Array.isArray(params.name) ? params.name[0] : params.name;

      if (!tableName) {
        throw new Error("Table name is required");
      }

      const description = await describeTable(deps.pool, tableName);

      if (!description) {
        throw new Error(`Table not found: ${tableName}`);
      }

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(description, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    },
  );
}
