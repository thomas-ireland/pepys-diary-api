import { prisma } from "./client.js";
import { seed } from "./seed.js";

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
