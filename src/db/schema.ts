import type { DbPool } from "./pool";

export type TableSummary = {
  schema: string;
  name: string;
  comment: string | null;
  estimatedRowCount: number | null;
};

export type ColumnSummary = {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isUnique: boolean;
  references: ColumnReference | null;
};

export type ColumnReference = {
  schema: string;
  table: string;
  column: string;
};

export type TableDescription = {
  schema: string;
  name: string;
  columns: ColumnSummary[];
  indexes: TableIndexSummary[];
};

export type RelationshipSummary = {
  constraintName: string;
  sourceSchema: string;
  sourceTable: string;
  sourceColumn: string;
  targetSchema: string;
  targetTable: string;
  targetColumn: string;
};

export type TableIndexSummary = {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
};

export async function listTables(pool: DbPool): Promise<TableSummary[]> {
  const result = await pool.query<{
    table_schema: string;
    table_name: string;
    table_comment: string | null;
    estimated_row_count: string | number | null;
  }>(
    `
      select
        t.table_schema,
        t.table_name,
        pg_catalog.obj_description(c.oid, 'pg_class') as table_comment,
        c.reltuples as estimated_row_count
      from information_schema.tables t
      join pg_catalog.pg_namespace n
        on n.nspname = t.table_schema
      join pg_catalog.pg_class c
        on c.relnamespace = n.oid
       and c.relname = t.table_name
      where t.table_type = 'BASE TABLE'
        and t.table_schema not in ('information_schema', 'pg_catalog')
      order by table_schema, table_name
    `,
  );

  return result.rows.map((row) => ({
    schema: row.table_schema,
    name: row.table_name,
    comment: row.table_comment,
    estimatedRowCount:
      row.estimated_row_count === null
        ? null
        : Math.max(0, Math.round(Number(row.estimated_row_count))),
  }));
}

export async function describeTable(
  pool: DbPool,
  tableName: string,
  schemaName = "public",
): Promise<TableDescription | null> {
  const result = await pool.query<{
    column_name: string;
    data_type: string;
    is_nullable: "YES" | "NO";
    column_default: string | null;
    is_primary_key: boolean;
    is_unique: boolean;
    referenced_schema: string | null;
    referenced_table: string | null;
    referenced_column: string | null;
  }>(
    `
      select
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        exists (
          select 1
          from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu
            on tc.constraint_name = kcu.constraint_name
           and tc.table_schema = kcu.table_schema
          where tc.constraint_type = 'PRIMARY KEY'
            and tc.table_schema = c.table_schema
            and tc.table_name = c.table_name
            and kcu.column_name = c.column_name
        ) as is_primary_key,
        exists (
          select 1
          from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu
            on tc.constraint_name = kcu.constraint_name
           and tc.table_schema = kcu.table_schema
          where tc.constraint_type in ('PRIMARY KEY', 'UNIQUE')
            and tc.table_schema = c.table_schema
            and tc.table_name = c.table_name
            and kcu.column_name = c.column_name
        ) as is_unique,
        fk.target_schema as referenced_schema,
        fk.target_table as referenced_table,
        fk.target_column as referenced_column
      from information_schema.columns c
      left join (
        select
          tc.table_schema as source_schema,
          tc.table_name as source_table,
          kcu.column_name as source_column,
          ccu.table_schema as target_schema,
          ccu.table_name as target_table,
          ccu.column_name as target_column
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on tc.constraint_name = kcu.constraint_name
         and tc.table_schema = kcu.table_schema
        join information_schema.constraint_column_usage ccu
          on ccu.constraint_name = tc.constraint_name
         and ccu.table_schema = tc.table_schema
        where tc.constraint_type = 'FOREIGN KEY'
      ) fk
        on fk.source_schema = c.table_schema
       and fk.source_table = c.table_name
       and fk.source_column = c.column_name
      where c.table_schema = $1
        and c.table_name = $2
      order by ordinal_position
    `,
    [schemaName, tableName],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const indexResult = await pool.query<{
    index_name: string;
    column_name: string;
    is_unique: boolean;
    is_primary: boolean;
    ordinal_position: number;
  }>(
    `
      select
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary,
        key_columns.ordinality as ordinal_position
      from pg_catalog.pg_class t
      join pg_catalog.pg_namespace n
        on n.oid = t.relnamespace
      join pg_catalog.pg_index ix
        on ix.indrelid = t.oid
      join pg_catalog.pg_class i
        on i.oid = ix.indexrelid
      join unnest(ix.indkey) with ordinality as key_columns(attnum, ordinality)
        on true
      join pg_catalog.pg_attribute a
        on a.attrelid = t.oid
       and a.attnum = key_columns.attnum
      where n.nspname = $1
        and t.relname = $2
      order by i.relname, key_columns.ordinality
    `,
    [schemaName, tableName],
  );

  const indexesByName = new Map<string, TableIndexSummary>();

  for (const row of indexResult.rows) {
    const existing = indexesByName.get(row.index_name);

    if (existing) {
      existing.columns.push(row.column_name);
      continue;
    }

    indexesByName.set(row.index_name, {
      name: row.index_name,
      columns: [row.column_name],
      isUnique: row.is_unique,
      isPrimary: row.is_primary,
    });
  }

  return {
    schema: schemaName,
    name: tableName,
    columns: result.rows.map((row) => ({
      name: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable === "YES",
      defaultValue: row.column_default,
      isPrimaryKey: row.is_primary_key,
      isUnique: row.is_unique,
      references:
        row.referenced_schema && row.referenced_table && row.referenced_column
          ? {
              schema: row.referenced_schema,
              table: row.referenced_table,
              column: row.referenced_column,
            }
          : null,
    })),
    indexes: [...indexesByName.values()],
  };
}

export async function listRelationships(
  pool: DbPool,
): Promise<RelationshipSummary[]> {
  const result = await pool.query<{
    constraint_name: string;
    source_schema: string;
    source_table: string;
    source_column: string;
    target_schema: string;
    target_table: string;
    target_column: string;
  }>(
    `
      select
        tc.constraint_name,
        tc.table_schema as source_schema,
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_schema as target_schema,
        ccu.table_name as target_table,
        ccu.column_name as target_column
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name
       and ccu.table_schema = tc.table_schema
      where tc.constraint_type = 'FOREIGN KEY'
      order by
        tc.table_schema,
        tc.table_name,
        tc.constraint_name,
        kcu.ordinal_position
    `,
  );

  return result.rows.map((row) => ({
    constraintName: row.constraint_name,
    sourceSchema: row.source_schema,
    sourceTable: row.source_table,
    sourceColumn: row.source_column,
    targetSchema: row.target_schema,
    targetTable: row.target_table,
    targetColumn: row.target_column,
  }));
}
