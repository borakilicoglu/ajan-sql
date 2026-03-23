export const TOOL_NAMES = {
  listTables: "list_tables",
  describeTable: "describe_table",
  listRelationships: "list_relationships",
  runReadonlyQuery: "run_readonly_query",
  explainQuery: "explain_query",
  sampleRows: "sample_rows",
} as const;

export const TOOL_NAME_LIST = [
  TOOL_NAMES.listTables,
  TOOL_NAMES.describeTable,
  TOOL_NAMES.listRelationships,
  TOOL_NAMES.runReadonlyQuery,
  TOOL_NAMES.explainQuery,
  TOOL_NAMES.sampleRows,
] as const;

export type ToolName = (typeof TOOL_NAME_LIST)[number];
