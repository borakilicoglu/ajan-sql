## What's Changed

- Initial public release of `ajan-sql`
- Added schema inspection tools:
  - `list_tables`
  - `describe_table`
  - `list_relationships`
- Added guarded readonly query execution:
  - `run_readonly_query`
  - `explain_query`
  - `sample_rows`
- Added PostgreSQL-backed MCP resources:
  - `schema://snapshot`
  - `schema://table/{name}`
- Added VitePress documentation and GitHub Actions workflows
