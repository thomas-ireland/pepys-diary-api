import { describe, expect, it } from "vitest";
import { assembleRecords } from "./assemble.js";
import { SOURCE_PATH } from "./paths.js";
import { loadLines } from "./structure.js";

const lines = loadLines(SOURCE_PATH);
const records = assembleRecords(lines);

describe("assembleRecords (against the real, full source)", () => {
  it("produces 3413 records before any manual fixes", () => {
    expect(records).toHaveLength(3413);
  });

  it("never fails the automatic word-conservation check on its own", () => {
    // Every record the assembler produces unaided passes reconstruction --
    // the 5 known traps are corrected separately by applyManualFixes, which
    // stamps confidence low regardless of what this automatic check found.
    expect(records.filter((r) => r.confidence === "low")).toHaveLength(0);
  });

  it("starts on 1660-01-01 and ends on 1669-05-31", () => {
    expect(records[0]?.date).toBe("1660-01-01");
    expect(records.at(-1)?.date).toBe("1669-05-31");
  });

  it("prepends a month's un-dated leading prose to its first entry, with its own footnotes extracted", () => {
    // January 1660 opens with a long historical preamble before "1st.",
    // itself containing several footnotes (the "year did not legally begin"
    // note, and short biographies of Lambert, Lawson, and Downing) -- those
    // are extracted into commentary just like any entry's footnotes, not
    // left as raw bracketed text.
    const jan1660 = records.find((r) => r.date === "1660-01-01");
    expect(jan1660?.entryText).toMatch(
      /^Blessed be God, at the end of the last year/,
    );
    expect(jan1660?.entryText).not.toContain(
      "Pepys’s house was on the south side",
    );
    expect(jan1660?.entryText).not.toContain("John Lambert, major-general");
    expect(jan1660?.commentary.length).toBeGreaterThanOrEqual(10);
  });

  it("includes the preamble in sourceLines too, not just the dated portion", () => {
    // The month block starts at line 1702 (right after the JANUARY header);
    // sourceLines must cover the whole thing prose was pulled from, or
    // provenance for those 135 preamble lines silently understates itself.
    const jan1660 = records.find((r) => r.date === "1660-01-01");
    expect(jan1660?.sourceLines[0]).toBe(1702);
  });

  it("naturally parses a well-formed multi-day entry with no fix needed", () => {
    // "16th, 17th, 18th, 19th." -- every token is well-formed, so this spans
    // 4 days as one record straight out of assembleRecords.
    const combined = records.find((r) => r.date === "1661-07-16");
    expect(combined).toBeDefined();
    expect(combined?.dateEnd).toBe("1661-07-19");
  });
});
