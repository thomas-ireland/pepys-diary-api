import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assembleRecords } from "./assemble.js";
import { applyManualFixes } from "./manualFixes.js";
import { OUTPUT_PATH, SOURCE_PATH, SOURCE_SHA256 } from "./paths.js";
import { loadLines } from "./structure.js";

/**
 * The committed data/diary.json must be exactly what regenerating from
 * source produces right now -- never a stale snapshot from an earlier
 * version of the pipeline. If this fails, someone changed the ingestion
 * logic without running `npm run build:data` to regenerate the committed
 * output.
 */
describe("data/diary.json (the committed output)", () => {
  const committed = JSON.parse(readFileSync(OUTPUT_PATH, "utf8"));
  const lines = loadLines(SOURCE_PATH);
  const fresh = {
    sourceSha256: SOURCE_SHA256,
    entries: applyManualFixes(assembleRecords(lines)),
  };

  it("matches a fresh regeneration from source exactly", () => {
    expect(committed).toEqual(fresh);
  });
});
