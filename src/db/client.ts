import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set — copy .env.example to .env for local development.",
  );
}

// Prisma 7 requires a driver adapter; `new PrismaClient()` alone throws.
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
