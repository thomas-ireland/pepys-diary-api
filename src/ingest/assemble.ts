import { isoDate, isValidYmd } from "./calendar.js";
import { findDayBoundaries } from "./dayLine.js";
import { processEntry, type CommentaryNote } from "./segment.js";
import { findDiaryBodyRegion, findMonthHeaders } from "./structure.js";
import { verifyReconstruction } from "./verify.js";

export interface DiaryRecord {
  /** ISO date this entry starts on. Unique across entries, so it's the key. */
  date: string;
  /**
   * ISO date this entry ends on. Equal to `date` for the ordinary
   * single-day entry; later only for the handful Pepys wrote as one
   * passage spanning several days ("These four days we spent in...").
   */
  dateEnd: string;
  dayLabel: string | null;
  entryText: string;
  commentary: CommentaryNote[];
  confidence: "high" | "low";
  /** The raw source chunk, kept only when reconstruction failed, for debugging. */
  rawSnippet: string | null;
  /** 1-indexed [first line, last line] in the source. */
  sourceLines: [number, number];
}

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Walks every month header, finds every day boundary within it, and turns
 * each into a record. A month's first entry sometimes has un-dated prose
 * before its first day boundary (e.g. January 1660 opens with a long
 * historical preamble before "1st." even appears) -- that prose is prepended
 * to the month's first entry rather than dropped, and the same prose is
 * included when checking word conservation for that entry.
 */
export function assembleRecords(lines: string[]): DiaryRecord[] {
  const region = findDiaryBodyRegion(lines);
  const headers = findMonthHeaders(lines, region.start, region.end);
  const records: DiaryRecord[] = [];

  for (let hidx = 0; hidx < headers.length; hidx++) {
    const header = headers[hidx];
    if (!header) continue;
    const blockStart = header.line + 1;
    const blockEnd =
      hidx + 1 < headers.length
        ? (headers[hidx + 1]?.line ?? region.end)
        : region.end;
    const boundaries = findDayBoundaries(lines, blockStart, blockEnd);
    if (!boundaries.length) continue;

    const firstBoundary = boundaries[0];
    if (!firstBoundary) continue;
    const preTextLines = lines.slice(blockStart, firstBoundary.line);
    const preText = normalizeWs(preTextLines.join(" "));
    // Some months open with un-dated prose before their first day boundary
    // (e.g. January 1660's long historical preamble), and that prose has its
    // own footnotes in the source -- so it's run through the same
    // segmentation/extraction as any entry, not just flattened into text.
    const preProcessed = preText
      ? processEntry(lines, blockStart, firstBoundary.line, 0)
      : null;

    for (let bidx = 0; bidx < boundaries.length; bidx++) {
      const boundary = boundaries[bidx];
      if (!boundary) continue;
      const segStart = boundary.line;
      const segEnd =
        bidx + 1 < boundaries.length
          ? (boundaries[bidx + 1]?.line ?? blockEnd)
          : blockEnd;
      const firstLineOffset = boundary.matchEnd;

      const processed = processEntry(lines, segStart, segEnd, firstLineOffset);
      let { entryText } = processed;
      let commentary = processed.commentary;
      const chunkForVerify = lines.slice(segStart, segEnd);
      let verifyLines = chunkForVerify;
      let verifyOffset = firstLineOffset;
      let sourceStart = segStart;

      if (bidx === 0 && preProcessed) {
        entryText = preProcessed.entryText
          ? entryText
            ? `${preProcessed.entryText}\n\n${entryText}`.trim()
            : preProcessed.entryText
          : entryText;
        commentary = preProcessed.commentary.concat(commentary);
        verifyLines = [
          preTextLines,
          [(chunkForVerify[0] as string).slice(firstLineOffset)],
          chunkForVerify.slice(1),
        ].flat();
        verifyOffset = 0;
        sourceStart = blockStart;
      }

      const { ok } = verifyReconstruction(
        verifyLines,
        entryText,
        commentary,
        verifyOffset,
      );

      const { year, month } = header;
      const days = boundary.days;
      const firstDay = days[0] as number;
      const lastDay = days[days.length - 1] as number;

      // A day number the calendar rejects means the source says something we
      // don't understand -- fail loudly rather than emit a record with a
      // hole where its date should be.
      if (
        !isValidYmd(year, month, firstDay) ||
        !isValidYmd(year, month, lastDay)
      ) {
        throw new Error(
          `Invalid date at source line ${segStart + 1}: ${year}-${month}-${firstDay}` +
            (days.length > 1 ? ` to ${year}-${month}-${lastDay}` : ""),
        );
      }

      const date = isoDate(year, month, firstDay);
      const dateEnd = isoDate(year, month, lastDay);

      records.push({
        date,
        dateEnd,
        dayLabel: boundary.label,
        entryText,
        commentary,
        confidence: ok ? "high" : "low",
        rawSnippet: ok ? null : chunkForVerify.join("\n"),
        sourceLines: [sourceStart + 1, segEnd],
      });
    }
  }

  return records;
}
