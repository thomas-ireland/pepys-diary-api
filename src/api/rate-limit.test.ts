import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";

/**
 * Its own file with its own app instance, deliberately isolated from
 * server.test.ts and the route test files -- exhausting a rate limit here
 * must not eat into the request budget other tests rely on.
 */
describe("rate limiting", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("enforces /search's stricter limit (20/min) before the global default (100/min)", async () => {
    // Rate limiting runs on Fastify's onRequest hook, ahead of validation and
    // any DB access -- an empty query still counts against the limit, so
    // this stays a DB-free unit test rather than needing real seeded data.
    let last;
    for (let i = 0; i < 21; i++) {
      last = await app.inject({ method: "GET", url: "/search" });
    }
    expect(last!.statusCode).toBe(429);
    expect(last!.json().message).toMatch(/rate limit exceeded/i);
    expect(last!.headers["retry-after"]).toBeDefined();
  });
});
