import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/**/*.local.test.ts"],
    environment: "node",
    globals: true,
  },
});
