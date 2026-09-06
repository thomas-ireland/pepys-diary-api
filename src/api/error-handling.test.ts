import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../db/client.js";
import { buildServer } from "./server.js";

/**
 * days.ts and search.ts don't catch their own DB calls -- an unexpected
 * failure (the database being down, say) propagates to Fastify's default
 * error handling, which by default serializes the real error's own message
 * into the response. This tests that server.ts's global error handler
 * catches that instead, for the two routes that actually hit the database.
 */
describe("undisclosed error responses", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("doesn't leak database internals when /days/:date fails unexpectedly", async () => {
    vi.spyOn(prisma.day, "findUnique").mockRejectedValue(
      new Error("Can't reach database server at `internal-db.private:5432`"),
    );

    const response = await app.inject({
      method: "GET",
      url: "/days/1660-01-01",
    });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      statusCode: 500,
      error: "Internal Server Error",
      message: "internal server error",
    });
    expect(response.payload).not.toContain("internal-db.private");
  });

  it("doesn't leak database internals when /search fails unexpectedly", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValue(
      new Error("Can't reach database server at `internal-db.private:5432`"),
    );

    const response = await app.inject({
      method: "GET",
      url: "/search?q=plague",
    });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      statusCode: 500,
      error: "Internal Server Error",
      message: "internal server error",
    });
    expect(response.payload).not.toContain("internal-db.private");
  });

  it("still passes through the real message for genuine 4xx errors", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/days/not-a-date",
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toMatch(/YYYY-MM-DD/);
  });
});
