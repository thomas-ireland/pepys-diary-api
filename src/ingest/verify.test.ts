import { describe, expect, it } from "vitest";
import { matchDayLine } from "./dayLine.js";
import { SOURCE_PATH } from "./paths.js";
import { processEntry } from "./segment.js";
import { loadLines } from "./structure.js";
import { verifyReconstruction } from "./verify.js";

const lines = loadLines(SOURCE_PATH);

/** 1-indexed source line -> 0-indexed array position. */
function idx(sourceLine: number): number {
  return sourceLine - 1;
}

describe("verifyReconstruction (against the diary's real first two entries)", () => {
  it("confirms no words are lost or fabricated for a simple entry (one block + one inline footnote)", () => {
    const start = idx(1837);
    const end = idx(1869);
    const offset = matchDayLine(lines[start] as string)?.textStart as number;
    const { entryText, commentary } = processEntry(lines, start, end, offset);
    const result = verifyReconstruction(
      lines.slice(start, end),
      entryText,
      commentary,
      offset,
    );
    expect(result).toEqual({ ok: true, missing: {}, extra: {} });
  });

  it("confirms no words are lost or fabricated for a denser entry (7 footnotes, one multi-paragraph with an attribution)", () => {
    const start = idx(1869);
    const end = idx(1967);
    const offset = matchDayLine(lines[start] as string)?.textStart as number;
    const { entryText, commentary } = processEntry(lines, start, end, offset);
    const result = verifyReconstruction(
      lines.slice(start, end),
      entryText,
      commentary,
      offset,
    );
    expect(result).toEqual({ ok: true, missing: {}, extra: {} });
  });

  it("catches a genuinely dropped word", () => {
    const start = idx(1837);
    const end = idx(1869);
    const offset = matchDayLine(lines[start] as string)?.textStart as number;
    const { entryText, commentary } = processEntry(lines, start, end, offset);
    const corrupted = entryText.replace("Went to Mr. Gunning’s", "Went to Mr.");
    const result = verifyReconstruction(
      lines.slice(start, end),
      corrupted,
      commentary,
      offset,
    );
    expect(result.ok).toBe(false);
    expect(result.missing).toHaveProperty("gunning’s");
  });

  it("catches a fabricated word", () => {
    const start = idx(1837);
    const end = idx(1869);
    const offset = matchDayLine(lines[start] as string)?.textStart as number;
    const { entryText, commentary } = processEntry(lines, start, end, offset);
    const corrupted = `${entryText} spuriousinventedword`;
    const result = verifyReconstruction(
      lines.slice(start, end),
      corrupted,
      commentary,
      offset,
    );
    expect(result.ok).toBe(false);
    expect(result.extra).toHaveProperty("spuriousinventedword");
  });
});
