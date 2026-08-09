import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { prisma } from "../../db/client.js";
import { buildServer } from "../server.js";

describe("days routes against a real database", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("returns the first entry of the diary", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/days/1660-01-01",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.date).toBe("1660-01-01");
    expect(body.label).toBe("Lord’s day");
    expect(body.entry.id).toBe(1);
    expect(body.entry.commentary).toHaveLength(10);
  });

  it("returns entry: null for a day Pepys wrote nothing", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/days/1661-11-26",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      date: "1661-11-26",
      label: null,
      entry: null,
    });
  });

  it("points every day of a multi-day entry at the same entry", async () => {
    const first = await app.inject({ method: "GET", url: "/days/1661-07-08" });
    const last = await app.inject({ method: "GET", url: "/days/1661-07-13" });
    expect(first.json().entry.id).toBe(555);
    expect(last.json().entry.id).toBe(555);
    expect(last.json().entry.text).toBe(first.json().entry.text);
  });

  it("404s a date before the diary starts", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/days/1659-12-31",
    });
    expect(response.statusCode).toBe(404);
  });

  it("404s a date after the diary ends", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/days/1669-06-01",
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns an inclusive range in date order", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/days?from=1660-01-01&to=1660-01-03",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.map((day: { date: string }) => day.date)).toEqual([
      "1660-01-01",
      "1660-01-02",
      "1660-01-03",
    ]);
  });
});
