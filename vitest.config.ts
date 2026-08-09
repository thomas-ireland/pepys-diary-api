import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defaultExclude, defineConfig } from "vitest/config";

// Integration tests need DATABASE_URL. Locally that comes from .env; in CI it's
// already in the environment and no .env exists, hence the guard.
if (existsSync(".env")) loadEnvFile();

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          exclude: [...defaultExclude, "**/*.integration.test.ts"],
        },
      },
      {
        // Split out rather than skipped-when-absent, so a run without a
        // database is obviously not covering these instead of quietly
        // reporting green.
        test: {
          name: "integration",
          include: ["**/*.integration.test.ts"],
          // The suite seeds the database, so parallel files would fight.
          fileParallelism: false,
        },
      },
    ],
  },
});
