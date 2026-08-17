import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";

/**
 * Driven through app.inject(), so nothing here binds a port or needs a
 * database — the health check's database behaviour is covered in
 * server.integration.test.ts.
 */
describe("server", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves an OpenAPI document describing itself", () => {
    const spec = app.swagger();
    expect(spec.info?.title).toBe("The Diary of Samuel Pepys API");
    expect(spec.paths?.["/health"]).toBeDefined();
  });

  it("404s an unknown route", async () => {
    const response = await app.inject({ method: "GET", url: "/nope" });
    expect(response.statusCode).toBe(404);
  });

  it("serves the documentation UI", async () => {
    const response = await app.inject({ method: "GET", url: "/docs/" });
    expect(response.statusCode).toBe(200);
  });

  it("sets baseline security headers on every response", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["content-security-policy"]).toBe(
      "default-src 'self';base-uri 'self';font-src 'self' https: data:;" +
        "form-action 'self';frame-ancestors 'self';img-src 'self' data:;" +
        "object-src 'none';script-src 'self';script-src-attr 'none';" +
        "style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
    );
  });
});
