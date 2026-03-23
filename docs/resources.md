# Resources

## Resource Matrix

| Resource | Purpose | Shape |
| --- | --- | --- |
| `schema://snapshot` | Return a schema snapshot with table and relationship metadata | `{ tables: TableSummary[], relationships: RelationshipSummary[] }` |
| `schema://table/{name}` | Return schema details for one table | `TableDescription` |

## Shared Contract

All resources currently return JSON text content with:

- `mimeType`: `application/json`
- `text`: pretty-printed JSON payload

## Canonical Source

The canonical resource registration and runtime payload behavior live in:

- `src/resources/schema-resources.ts`
- `src/db/schema.ts`

## `schema://snapshot`

Returns a combined schema snapshot for the active dialect.

Payload:

```json
{
  "tables": [
    {
      "schema": "public",
      "name": "users",
      "comment": "Application users",
      "estimatedRowCount": 42
    }
  ],
  "relationships": [
    {
      "constraintName": "posts_user_id_fkey",
      "sourceSchema": "public",
      "sourceTable": "posts",
      "sourceColumn": "user_id",
      "targetSchema": "public",
      "targetTable": "users",
      "targetColumn": "id"
    }
  ]
}
```

## `schema://table/{name}`

Returns one table description for the requested table name.

Notes:

- `name` is required
- PostgreSQL defaults to the `public` schema in the current implementation
- SQLite ignores schema distinctions

Payload:

```json
{
  "schema": "public",
  "name": "users",
  "columns": [
    {
      "name": "id",
      "dataType": "bigint",
      "isNullable": false,
      "defaultValue": null,
      "isPrimaryKey": true,
      "isUnique": true,
      "references": null
    }
  ],
  "indexes": [
    {
      "name": "users_pkey",
      "columns": ["id"],
      "isUnique": true,
      "isPrimary": true
    }
  ]
}
```
