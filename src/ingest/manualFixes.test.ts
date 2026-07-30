import { describe, expect, it } from "vitest";
import { assembleRecords } from "./assemble.js";
import { applyManualFixes } from "./manualFixes.js";
import { SOURCE_PATH } from "./paths.js";
import { loadLines } from "./structure.js";

const lines = loadLines(SOURCE_PATH);

function freshRecords() {
  return applyManualFixes(assembleRecords(lines));
}

describe("applyManualFixes (against the real, full source)", () => {
  const records = freshRecords();

  it("removes exactly one record (the spurious pence-collision fragment)", () => {
    expect(records).toHaveLength(3411);
  });

  it("flags exactly the 5 known trap entries as low confidence", () => {
    const lowIds = records
      .filter((r) => r.confidence === "low")
      .map((r) => r.id)
      .sort();
    expect(lowIds).toEqual([
      "1661-07-08_to_1661-07-13",
      "1661-11-14",
      "1662-05-20",
      "1664-12-06",
      "1667-01-28",
    ]);
  });

  it("extends the Loth OCR-artifact entry to its full 8-13 July range", () => {
    const r = records.find((rec) => rec.id === "1661-07-08_to_1661-07-13");
    expect(r?.dateEnd).toBe("1661-07-13");
    expect(r?.entryText.startsWith("Loth")).toBe(false);
    expect(r?.entryText).toMatch(/^I fell to work/);
  });

  it("renumbers the three mistyped ordinals, identified by their exact source lines", () => {
    // Each source date has an unrelated, correctly-dated entry elsewhere in
    // the diary too, so the old id alone can still legitimately exist --
    // what proves the right record was fixed is its source line range.
    expect(records.find((r) => r.id === "1661-11-14")?.sourceLines).toEqual([
      17181, 17193,
    ]);
    expect(records.find((r) => r.id === "1662-05-20")?.sourceLines).toEqual([
      20374, 20396,
    ]);
    expect(records.find((r) => r.id === "1664-12-06")?.sourceLines).toEqual([
      47924, 47953,
    ]);
  });

  it("merges the pence-collision fragment back into 1667-01-28", () => {
    const r = records.find((rec) => rec.id === "1667-01-28");
    expect(r?.entryText).toContain("3s. 2d. change for each.");
  });
});
