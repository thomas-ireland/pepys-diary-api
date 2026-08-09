import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig } from "prisma/config";

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
    // Deliberately not prisma's env(), which throws when the variable is
    // unset. Validating the schema and generating the client don't need a
    // database, so this lets the whole gate run on a fresh clone with no
    // .env and no Postgres. Commands that do need a connection still fail
    // loudly, with "Connection url is empty".
    url: process.env.DATABASE_URL ?? "",
  },
});
