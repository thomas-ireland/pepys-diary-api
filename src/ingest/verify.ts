import type { CommentaryNote } from "./segment.js";

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Case- and structural-punctuation-insensitive word tokens: brackets and
 * dashes are markers the parsing itself introduces (footnote delimiters),
 * not content, so they're stripped before comparing.
 */
function tokenizeForVerify(text: string): string[] {
  const cleaned = text.replace(/[[\]]|--|—/g, " ");
  return normalizeWs(cleaned).toLowerCase().split(/\s+/).filter(Boolean);
}

function wordCounts(words: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return counts;
}

/** How much each word in `a` exceeds its count in `b`, for words where it does. */
function countDiff(
  a: Map<string, number>,
  b: Map<string, number>,
): Record<string, number> {
  const diff: Record<string, number> = {};
  for (const [word, count] of a) {
    const excess = count - (b.get(word) ?? 0);
    if (excess > 0) diff[word] = excess;
  }
  return diff;
}

export interface ReconstructionCheck {
  ok: boolean;
  /** Words present in the raw source that are missing from entryText + commentary. */
  missing: Record<string, number>;
  /** Words present in entryText + commentary that aren't in the raw source. */
  extra: Record<string, number>;
}

/**
 * Proves nothing was silently dropped (or fabricated) while segmenting an
 * entry: every word in the raw source lines must appear somewhere across the
 * visible text and the extracted commentary, and nothing else.
 */
export function verifyReconstruction(
  rawChunkLines: string[],
  entryText: string,
  commentary: CommentaryNote[],
  firstLineOffset: number,
): ReconstructionCheck {
  const original = rawChunkLines.slice();
  if (original.length)
    original[0] = (original[0] as string).slice(firstLineOffset);
  const originalWords = tokenizeForVerify(original.join("\n"));

  let recon = entryText;
  for (const c of commentary) {
    recon += ` ${c.note}`;
    if (c.source) {
      // Attribution is stored without its trailing period (e.g. "B", not
      // "B."); the original always has the period immediately before the
      // closing bracket, so add it back for a like-for-like comparison.
      recon += ` ${c.source}.`;
    }
  }
  const reconWords = tokenizeForVerify(recon);

  const originalCounts = wordCounts(originalWords);
  const reconCounts = wordCounts(reconWords);
  const missing = countDiff(originalCounts, reconCounts);
  const extra = countDiff(reconCounts, originalCounts);
  return {
    ok: Object.keys(missing).length === 0 && Object.keys(extra).length === 0,
    missing,
    extra,
  };
}
