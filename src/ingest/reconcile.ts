import type { DiaryRecord } from "./assemble.js";
import { enumerateDates, parseIsoDate } from "./calendar.js";
import { findDiaryBodyRegion, findMonthHeaders } from "./structure.js";

export const DIARY_START = "1660-01-01";
export const DIARY_END = "1669-05-31";

export interface ReconciliationReport {
  expectedCount: number;
  /** Calendar days in range with no record covering them. */
  missing: string[];
  /** Calendar days covered by more than one record. */
  duplicates: string[];
}

/**
 * The permanent answer to "does it have all the entries?": every calendar
 * day in the diary's range must be covered by exactly one record (multi-day
 * records via date/dateEnd count for each day they span), or explicitly
 * listed as missing so the gap can be explained rather than silently absent.
 */
export function reconcile(records: DiaryRecord[]): ReconciliationReport {
  const expected = enumerateDates(
    parseIsoDate(DIARY_START),
    parseIsoDate(DIARY_END),
  );
  const coverage = new Map<string, number>();
  for (const r of records) {
    for (const d of enumerateDates(
      parseIsoDate(r.date),
      parseIsoDate(r.dateEnd),
    )) {
      coverage.set(d, (coverage.get(d) ?? 0) + 1);
    }
  }
  return {
    expectedCount: expected.length,
    missing: expected.filter((d) => !coverage.has(d)),
    duplicates: expected.filter((d) => (coverage.get(d) ?? 0) > 1),
  };
}

export interface SourceCoverageReport {
  totalBodyLines: number;
  /** 1-indexed source lines with real content that no record's sourceLines covers. */
  uncovered: number[];
  /** 1-indexed source lines covered by more than one record. */
  doubleCovered: number[];
}

/**
 * Word conservation (verify.ts) proves nothing is lost *within* an entry it
 * already found. This proves nothing is lost *between* entries: every line
 * of the diary body -- other than month headers and blank lines -- must be
 * claimed by exactly one record's sourceLines. This is what would have
 * caught the preText/sourceLines bug directly, rather than needing a
 * calendar-gap detour to notice something was off.
 */
export function checkSourceLineCoverage(
  lines: string[],
  records: DiaryRecord[],
): SourceCoverageReport {
  const region = findDiaryBodyRegion(lines);
  const headers = findMonthHeaders(lines, region.start, region.end);
  const headerLines = new Set(headers.map((h) => h.line));

  const coverage = new Map<number, number>();
  for (const r of records) {
    for (let n = r.sourceLines[0]; n <= r.sourceLines[1]; n++) {
      coverage.set(n, (coverage.get(n) ?? 0) + 1);
    }
  }

  const uncovered: number[] = [];
  const doubleCovered: number[] = [];
  for (let i = region.start; i < region.end; i++) {
    const oneIndexed = i + 1;
    const count = coverage.get(oneIndexed) ?? 0;
    if (count > 1) doubleCovered.push(oneIndexed);
    if (
      count === 0 &&
      !headerLines.has(i) &&
      (lines[i] as string).trim() !== ""
    ) {
      uncovered.push(oneIndexed);
    }
  }

  return {
    totalBodyLines: region.end - region.start,
    uncovered,
    doubleCovered,
  };
}
