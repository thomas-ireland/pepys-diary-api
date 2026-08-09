import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../server.js";

/**
 * Only the validation branches, which reject before the handler ever
 * queries the database -- so these run without one, like server.test.ts.
 * Behaviour that touches real rows lives in days.integration.test.ts.
 */
describe("days routes validation", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects a malformed date", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/days/not-a-date",
    });
    expect(response.statusCode).toBe(400);
  });

  it("rejects a date that doesn't exist on the calendar", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/days/1660-02-30",
    });
    expect(response.statusCode).toBe(400);
  });

  it("rejects a range query missing from/to", async () => {
    const response = await app.inject({ method: "GET", url: "/days" });
    expect(response.statusCode).toBe(400);
  });

  it("rejects a range where from is after to", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/days?from=1660-01-10&to=1660-01-01",
    });
    expect(response.statusCode).toBe(400);
  });
});
