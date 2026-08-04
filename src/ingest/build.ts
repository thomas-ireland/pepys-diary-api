import { writeFileSync } from "node:fs";
import { assembleRecords } from "./assemble.js";
import { applyManualFixes } from "./manualFixes.js";
import { OUTPUT_PATH, SOURCE_PATH, SOURCE_SHA256 } from "./paths.js";
import { checkSourceLineCoverage, reconcile } from "./reconcile.js";
import { loadLines } from "./structure.js";

/**
 * Regenerates data/diary.json from source. Deliberately refuses to write a
 * file that doesn't reconcile cleanly -- the whole point of the invariant
 * checks is that a bad output should never be able to reach the committed
 * file in the first place.
 */
function build(): void {
  const lines = loadLines(SOURCE_PATH);
  const entries = applyManualFixes(assembleRecords(lines));

  const dateReport = reconcile(entries);
  if (dateReport.duplicates.length > 0) {
    throw new Error(
      `Refusing to emit: duplicate date coverage for ${JSON.stringify(dateReport.duplicates)}`,
    );
  }

  const lineReport = checkSourceLineCoverage(lines, entries);
  if (lineReport.uncovered.length > 0 || lineReport.doubleCovered.length > 0) {
    throw new Error(
      `Refusing to emit: source-line coverage failed (uncovered: ${lineReport.uncovered.length}, double-covered: ${lineReport.doubleCovered.length})`,
    );
  }

  const output = { sourceSha256: SOURCE_SHA256, entries };
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");

  const confidence = {
    high: entries.filter((e) => e.confidence === "high").length,
    low: entries.filter((e) => e.confidence === "low").length,
  };
  console.log(
    `Wrote ${entries.length} entries to ${OUTPUT_PATH} (confidence: ${confidence.high} high, ${confidence.low} low; ${dateReport.missing.length} calendar days explained as missing).`,
  );
}

build();
