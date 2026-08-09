import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./client.js";
import { seed } from "./seed.js";

/**
 * Runs against a real Postgres — the seed's own count checks prove it wrote
 * *something*; these prove it wrote the right shape. Needs DATABASE_URL and a
 * migrated database (`npm run db:up && npm run db:migrate`).
 */
describe("seeded database", () => {
  beforeAll(async () => {
    await seed();
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("covers every calendar day of the diary, with no timezone drift", async () => {
    const [count, first, last] = await Promise.all([
      prisma.day.count(),
      prisma.day.findFirst({ orderBy: { date: "asc" } }),
      prisma.day.findFirst({ orderBy: { date: "desc" } }),
    ]);
    expect(count).toBe(3439);
    expect(first?.date.toISOString()).toBe("1660-01-01T00:00:00.000Z");
    expect(last?.date.toISOString()).toBe("1669-05-31T00:00:00.000Z");
  });

  it("leaves exactly the 19 known days without an entry", async () => {
    const blank = await prisma.day.findMany({
      where: { entryId: null },
      orderBy: { date: "asc" },
    });
    expect(blank.map((d) => d.date.toISOString().slice(0, 10))).toEqual([
      "1661-11-26",
      "1662-03-25",
      "1662-05-13",
      "1662-08-16",
      "1662-11-19",
      "1663-08-30",
      "1664-09-04",
      "1668-04-11",
      "1668-09-30",
      "1668-10-01",
      "1668-10-02",
      "1668-10-03",
      "1668-10-04",
      "1668-10-05",
      "1668-10-06",
      "1668-10-07",
      "1668-10-08",
      "1668-10-09",
      "1668-10-10",
    ]);
  });

  it("spans the two multi-day passages across several days each", async () => {
    const entries = await prisma.entry.findMany({
      include: { days: { orderBy: { date: "asc" } } },
    });
    const spans = entries
      .filter((e) => e.days.length > 1)
      .map((e) => e.days.map((d) => d.date.toISOString().slice(0, 10)))
      .sort((a, b) => (a[0] as string).localeCompare(b[0] as string));

    expect(spans).toHaveLength(2);
    expect(spans[0]?.at(0)).toBe("1661-07-08");
    expect(spans[0]?.at(-1)).toBe("1661-07-13");
    expect(spans[0]).toHaveLength(6);
    expect(spans[1]?.at(0)).toBe("1661-07-16");
    expect(spans[1]?.at(-1)).toBe("1661-07-19");
    expect(spans[1]).toHaveLength(4);
  });

  it("answers a day inside a multi-day passage with that passage, not a blank", async () => {
    // The distinction the day/entry split exists for: 10 July isn't a day he
    // wrote nothing, it's a day covered by the entry spanning 8-13 July.
    const day = await prisma.day.findUnique({
      where: { date: new Date("1661-07-10T00:00:00Z") },
      include: { entry: true },
    });
    expect(day?.entry?.text).toMatch(/^I fell to work/);
  });

  it("keeps each day's label with its own date", async () => {
    const day = await prisma.day.findUnique({
      where: { date: new Date("1660-01-01T00:00:00Z") },
      include: { entry: true },
    });
    expect(day?.label).toBe("Lord’s day");
    expect(day?.entry?.text).toMatch(
      /^Blessed be God, at the end of the last year/,
    );
  });

  it("collapses both spellings of Mynors Bright into one attribution", async () => {
    const grouped = await prisma.commentary.groupBy({
      by: ["source"],
      _count: { source: true },
      where: { source: { not: null } },
    });
    const counts = Object.fromEntries(
      grouped.map((g) => [g.source, g._count.source]),
    );
    expect(counts).toEqual({ B: 140, "M.B": 22, R: 1, Palsgrave: 1 });
    expect(counts["M. B"]).toBeUndefined();
  });

  it("keeps commentary in its original order within an entry", async () => {
    const entry = await prisma.entry.findFirst({
      where: { days: { some: { date: new Date("1660-01-02T00:00:00Z") } } },
      include: { commentary: { orderBy: { position: "asc" } } },
    });
    expect(entry?.commentary).toHaveLength(7);
    expect(entry?.commentary.map((c) => c.position)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
    expect(entry?.commentary[0]?.note).toBe(
      "Shepley was a servant of Admiral Sir Edward Montagu",
    );
  });

  it("is idempotent — reseeding reproduces the same rows and ids", async () => {
    const before = await prisma.entry.findMany({
      orderBy: { id: "asc" },
      take: 5,
    });
    await seed();
    const after = await prisma.entry.findMany({
      orderBy: { id: "asc" },
      take: 5,
    });
    expect(after).toEqual(before);
    expect(await prisma.entry.count()).toBe(3412);
  }, 60_000);
});
