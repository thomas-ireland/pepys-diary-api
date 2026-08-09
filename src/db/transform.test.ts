import { describe, expect, it } from "vitest";
import { normalizeSource, toDate } from "./transform.js";

describe("normalizeSource", () => {
  it("collapses both spellings of Mynors Bright onto one value", () => {
    expect(normalizeSource("M. B")).toBe("M.B");
    expect(normalizeSource("M.B")).toBe("M.B");
  });

  it("leaves the other attributions alone", () => {
    expect(normalizeSource("B")).toBe("B");
    expect(normalizeSource("R")).toBe("R");
    expect(normalizeSource("Palsgrave")).toBe("Palsgrave");
  });

  it("passes through an absent attribution", () => {
    expect(normalizeSource(null)).toBeNull();
  });
});

describe("toDate", () => {
  it("keeps the calendar day intact regardless of local timezone", () => {
    // Parsing "1660-01-01" as local time in a negative-offset zone would
    // land on 1659-12-31 once stored.
    expect(toDate("1660-01-01").toISOString()).toBe("1660-01-01T00:00:00.000Z");
    expect(toDate("1669-05-31").toISOString()).toBe("1669-05-31T00:00:00.000Z");
  });
});
