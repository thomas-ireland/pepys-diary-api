import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";

/**
 * Only the validation branches, which reject before the handler ever
 * queries the database. Behaviour that touches real rows lives in
 * search.integration.test.ts.
 */
describe("search route validation", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects a missing query", async () => {
    const response = await app.inject({ method: "GET", url: "/search" });
    expect(response.statusCode).toBe(400);
  });

  it("rejects a blank query", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/search?q=%20%20",
    });
    expect(response.statusCode).toBe(400);
  });

  it("rejects a limit outside 1..50", async () => {
    const zero = await app.inject({
      method: "GET",
      url: "/search?q=plague&limit=0",
    });
    expect(zero.statusCode).toBe(400);

    const tooMany = await app.inject({
      method: "GET",
      url: "/search?q=plague&limit=51",
    });
    expect(tooMany.statusCode).toBe(400);
  });
});
