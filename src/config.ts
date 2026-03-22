const DEFAULT_DB_POOL_MAX = 10;

export type AppConfig = {
  databaseUrl: string;
  dbPoolMax: number;
};

export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getAppConfig(): AppConfig {
  return {
    databaseUrl: getRequiredEnv("DATABASE_URL"),
    dbPoolMax: DEFAULT_DB_POOL_MAX,
  };
}
