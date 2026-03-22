import { describe, expect, it, vi } from "vitest";

import { getAppConfig, getRequiredEnv } from "../src/config";

describe("config", () => {
  it("reads DATABASE_URL from the environment", () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost/test");

    expect(getAppConfig()).toEqual({
      databaseUrl: "postgres://localhost/test",
      dbPoolMax: 10,
    });
  });

  it("fails fast when a required env variable is missing", () => {
    vi.stubEnv("DATABASE_URL", "");

    expect(() => getRequiredEnv("DATABASE_URL")).toThrow(
      "Missing required environment variable: DATABASE_URL",
    );
  });
});
