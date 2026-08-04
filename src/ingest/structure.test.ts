import { describe, expect, it } from "vitest";
import { SOURCE_PATH } from "./paths.js";
import {
  findDiaryBodyRegion,
  findMonthHeaders,
  loadLines,
  resolveYear,
} from "./structure.js";

describe("resolveYear", () => {
  it("returns the year as-is when there is no second year", () => {
    expect(resolveYear(1660)).toBe(1660);
  });

  it("uses a 4-digit second year directly", () => {
    expect(resolveYear(1659, "1660")).toBe(1660);
  });

  it("rebuilds a 2-digit second year using the first year's century", () => {
    expect(resolveYear(1660, "61")).toBe(1661);
  });
});

describe("month headers and diary body region (against the real source)", () => {
  const lines = loadLines(SOURCE_PATH);
  const region = findDiaryBodyRegion(lines);
  const headers = findMonthHeaders(lines, region.start, region.end);

  it("finds the region starting at the first month header line", () => {
    expect(lines[region.start]).toBe("JANUARY 1659-1660");
  });

  it("finds the region ending at the diary's own end marker", () => {
    expect(lines[region.end]).toBe("END OF THE DIARY.");
  });

  it("finds exactly 113 month headers -- one per month, Jan 1660 to May 1669", () => {
    expect(headers).toHaveLength(113);
  });

  it("resolves the first header to January 1660", () => {
    expect(headers[0]).toEqual({ line: region.start, month: 1, year: 1660 });
  });

  it("resolves the last header to May 1669", () => {
    expect(headers.at(-1)).toEqual({ line: 101011, month: 5, year: 1669 });
  });

  it("resolves the one abbreviated 2-digit header (line 12145) to 1661", () => {
    const header = headers.find((h) => h.line === 12144);
    expect(header).toEqual({ line: 12144, month: 2, year: 1661 });
  });
});
