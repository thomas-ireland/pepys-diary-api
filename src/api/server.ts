import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyInstance } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { cloudflareIpKeyGenerator } from "./cloudflare.js";
import { prisma } from "../db/client.js";
import { daysRoutes } from "./routes/days.js";
import { searchRoutes } from "./routes/search.js";

export interface BuildServerOptions {
  /** Pass false in tests to keep request logs out of the output. */
  logger?: boolean;
}

/**
 * Builds the app without listening, so tests can drive it through
 * `app.inject()` rather than binding a port.
 */
export async function buildServer(
  options: BuildServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : { level: process.env.LOG_LEVEL ?? "info" },
  }).withTypeProvider<ZodTypeProvider>();

  // One Zod schema per route drives validation, the OpenAPI document, and the
  // response types -- rather than three descriptions of the same shape.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet);

  // No auth on this API, so this is the main defence against abuse. /search
  // gets a stricter override (see routes/search.ts) since ts_rank/ts_headline
  // is real per-request DB work, unlike the indexed lookups on /days.
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: cloudflareIpKeyGenerator,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "The Diary of Samuel Pepys API",
        description:
          "The diary as queryable data: 3,412 entries across every day from 1 January 1660 to 31 May 1669, with the Victorian editors' footnotes kept separate from Pepys's own words.",
        version: "0.0.0",
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, { routePrefix: "/docs" });

  await app.register(daysRoutes);
  await app.register(searchRoutes);

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/health",
    schema: {
      summary: "Liveness and database connectivity",
      tags: ["meta"],
      response: {
        200: z.object({ status: z.literal("ok") }),
        503: z.object({ status: z.literal("error"), detail: z.string() }),
      },
    },
    handler: async (request, reply) => {
      // This service is only useful when it can reach the database, so the
      // health check says so rather than reporting a hollow "ok". The real
      // error (which can name internal hosts/credentials) goes to the
      // server's own log, not to whoever's asking -- this endpoint has no
      // auth and is reachable by anyone.
      try {
        await prisma.$queryRaw`SELECT 1`;
        return { status: "ok" as const };
      } catch (error) {
        request.log.error(error, "health check failed to reach the database");
        reply.code(503);
        return { status: "error" as const, detail: "database unreachable" };
      }
    },
  });

  return app;
}
