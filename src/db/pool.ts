import { Pool } from "pg";

export type DbPool = Pool;

type CreateDbPoolOptions = {
  connectionString: string;
  max?: number;
};

export function createDbPool(options: CreateDbPoolOptions): DbPool {
  return new Pool({
    connectionString: options.connectionString,
    max: options.max,
  });
}

export async function closeDbPool(pool: DbPool): Promise<void> {
  await pool.end();
}
