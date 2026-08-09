import { prisma } from "../db/client.js";
import { buildServer } from "./server.js";

const port = Number(process.env.PORT ?? 3000);
// Containers need 0.0.0.0; binding to localhost would make the service
// unreachable from outside its own network namespace.
const host = process.env.HOST ?? "0.0.0.0";

const app = await buildServer();

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    // ECS sends SIGTERM before stopping a task: finish in-flight requests and
    // release the database connections rather than dropping them.
    void (async () => {
      app.log.info(`${signal} received, shutting down`);
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    })();
  });
}

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
}
