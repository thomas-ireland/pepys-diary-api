import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig, env } from "prisma/config";

// Prisma 7 doesn't read .env itself. Locally that file supplies DATABASE_URL;
// in CI and deployment the variable is already in the environment, and no
// .env exists -- hence the guard, since loadEnvFile throws on a missing file.
if (existsSync(".env")) loadEnvFile();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
