import { describe, expect, it } from "vitest";
import { matchDayLine } from "./dayLine.js";
import { SOURCE_PATH } from "./paths.js";
import { processEntry } from "./segment.js";
import { loadLines } from "./structure.js";

const lines = loadLines(SOURCE_PATH);

/** 1-indexed source line -> 0-indexed array position. */
function idx(sourceLine: number): number {
  return sourceLine - 1;
}

describe("processEntry (against the diary's real first two entries)", () => {
  // Jan 1st, 1660: a block footnote (no attribution) interrupting mid-sentence,
  // then a later inline footnote in the same entry.
  const janFirstLine = lines[idx(1837)] as string;
  const janOffset = matchDayLine(janFirstLine)?.textStart as number;
  const jan1 = processEntry(lines, idx(1837), idx(1869), janOffset);

  it("removes both footnotes from the visible text", () => {
    expect(jan1.entryText).not.toContain("Peter Gunning");
    expect(jan1.entryText).not.toContain("Theophila Turner");
  });

  it("glues the sentence back together across the extracted block footnote", () => {
    expect(jan1.entryText).toContain(
      "Went to Mr. Gunning’s chapel at Exeter House",
    );
  });

  it("glues text back together across the extracted inline footnote", () => {
    expect(jan1.entryText).toContain(
      "Mrs. The. Turner and Madam Morrice, and supt with us.",
    );
  });

  it("produces a single continuous paragraph (no internal blank-line breaks to preserve)", () => {
    expect(jan1.entryText).not.toContain("\n\n");
  });

  it("extracts exactly two commentary notes, in order", () => {
    expect(jan1.commentary).toHaveLength(2);
  });

  it("extracts the block footnote with brackets stripped and no attribution present", () => {
    const [gunning] = jan1.commentary;
    expect(gunning?.note).toMatch(/^Peter Gunning, afterwards Master/);
    expect(gunning?.note).toMatch(/aged seventy-one\.$/);
    expect(gunning?.note).not.toContain("[");
    expect(gunning?.note).not.toContain("]");
    expect(gunning?.source).toBeNull();
  });

  it("anchors the block footnote to the 8 words immediately preceding it", () => {
    expect(jan1.commentary[0]?.anchor).toBe(
      "other, clothes but them. Went to Mr. Gunning’s",
    );
  });

  it("extracts the inline footnote text with no attribution", () => {
    const turner = jan1.commentary[1];
    expect(turner?.note).toBe(
      "Theophila Turner, daughter of Sergeant John and Jane Turner, who married Sir Arthur Harris, Bart. She died 1686.",
    );
    expect(turner?.source).toBeNull();
  });

  it("anchors the inline footnote to the word immediately preceding it", () => {
    expect(jan1.commentary[1]?.anchor.endsWith("Turner")).toBe(true);
  });

  // Jan 2nd: a longer entry with 7 footnotes, including one (Fairfax) that
  // spans multiple paragraphs -- it quotes two poems, each separated from
  // the surrounding prose by blank lines -- and carries a real attribution.
  const jan2FirstLine = lines[idx(1869)] as string;
  const jan2Offset = matchDayLine(jan2FirstLine)?.textStart as number;
  const jan2 = processEntry(lines, idx(1869), idx(1967), jan2Offset);

  it("extracts every footnote in a longer, denser entry", () => {
    expect(jan2.commentary).toHaveLength(7);
  });

  it("extracts the first inline footnote (Sheply) correctly", () => {
    expect(jan2.commentary[0]?.note).toBe(
      "Shepley was a servant of Admiral Sir Edward Montagu",
    );
    expect(jan2.commentary[0]?.source).toBeNull();
    expect(jan2.entryText).not.toContain("Shepley was a servant");
    expect(jan2.entryText).toContain("Mr. Sheply, who was drawing of sack");
  });

  it("bridges blank lines inside a multi-paragraph footnote quoting verse, and reads its attribution", () => {
    const fairfax = jan2.commentary[3];
    expect(fairfax?.note).toMatch(/^Thomas, Lord Fairfax, Generalissimo/);
    expect(fairfax?.note).toContain("O let that day from time be bloted quitt");
    expect(fairfax?.note).toContain("Excidat illa dies aevo");
    expect(fairfax?.note).toMatch(/murder of Louis XVI\.$/);
    expect(fairfax?.source).toBe("B");
  });
});
