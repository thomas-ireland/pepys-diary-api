import { describe, expect, it } from "vitest";
import { assembleRecords } from "./assemble.js";
import { applyManualFixes } from "./manualFixes.js";
import { SOURCE_PATH } from "./paths.js";
import { checkSourceLineCoverage, reconcile } from "./reconcile.js";
import { loadLines } from "./structure.js";

const lines = loadLines(SOURCE_PATH);
const records = applyManualFixes(assembleRecords(lines));

describe("reconcile (against the real, full, corrected pipeline output)", () => {
  const report = reconcile(records);

  it("expects 3439 calendar days across the diary's range", () => {
    expect(report.expectedCount).toBe(3439);
  });

  it("has zero duplicate date coverage", () => {
    expect(report.duplicates).toEqual([]);
  });

  it("is missing exactly the 19 known, explained dates -- not just 19 of something", () => {
    // 9 days Pepys wrote nothing (isolated), plus the documented 11-day
    // October 1668 gap (he went into the country; the source itself notes
    // the pages were left blank). A NEW date appearing here means a real
    // regression, not an expected gap -- exact match, not just a count.
    expect(report.missing).toEqual([
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
});

describe("checkSourceLineCoverage (against the real, full, corrected pipeline output)", () => {
  const report = checkSourceLineCoverage(lines, records);

  it("leaves no real content line unclaimed by any record", () => {
    expect(report.uncovered).toEqual([]);
  });

  it("has no line claimed by more than one record", () => {
    expect(report.doubleCovered).toEqual([]);
  });
});

describe("date ranges", () => {
  it("never runs backwards", () => {
    // A renumbered entry that updated `date` but not `dateEnd` would claim
    // to span from its corrected date back to its old wrong one.
    expect(records.filter((r) => r.dateEnd < r.date)).toEqual([]);
  });

  it("collapses to a single day except for the two Pepys wrote as one passage", () => {
    expect(
      records
        .filter((r) => r.dateEnd !== r.date)
        .map((r) => `${r.date}..${r.dateEnd}`),
    ).toEqual(["1661-07-08..1661-07-13", "1661-07-16..1661-07-19"]);
  });
});
