import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../db/client.js";
import { buildServer } from "../server.js";

describe("search route against a real database", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("finds the plague years, ranked and highlighted", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/search?q=plague",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.query).toBe("plague");
    expect(body.results.length).toBeGreaterThan(0);

    // Sept 1665 is deep in the outbreak, so it should rank near the top.
    expect(
      body.results.some((r: { dates: string[] }) =>
        r.dates[0]?.startsWith("1665"),
      ),
    ).toBe(true);

    const ranks = body.results.map((r: { rank: number }) => r.rank);
    expect(ranks).toEqual([...ranks].sort((a: number, b: number) => b - a));

    for (const result of body.results) {
      expect(result.snippet).toMatch(/<b>plague<\/b>/i);
      expect(result.dates.length).toBeGreaterThan(0);
    }
  });

  it("caps results at the given limit", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/search?q=plague&limit=2",
    });
    expect(response.json().results).toHaveLength(2);
  });

  it("returns no results for a query that matches nothing", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/search?q=zzznonexistentword",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().results).toEqual([]);
  });

  it("returns no results for a stopword-only query", async () => {
    const response = await app.inject({ method: "GET", url: "/search?q=the" });
    expect(response.statusCode).toBe(200);
    expect(response.json().results).toEqual([]);
  });
});
