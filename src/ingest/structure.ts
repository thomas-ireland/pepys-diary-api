import { readFileSync } from "node:fs";

export function loadLines(path: string): string[] {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n").split("\n");
}

const MONTH_NAMES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

const MONTH_HEADER_RE = new RegExp(
  `^(${MONTH_NAMES.join("|")}) (\\d{4})(?:-(\\d{2,4}))?$`,
);

const DIARY_END_MARKER = "END OF THE DIARY.";

/**
 * Jan/Feb/Mar headers carry a double year (e.g. "1659-1660") because the
 * legal year in Pepys's England began March 25th; the second year is the one
 * we want. A handful are abbreviated to 2 digits ("1660-61"), so we rebuild
 * the century from the first year rather than assume 4 digits.
 */
export function resolveYear(y1: number, y2raw?: string): number {
  if (y2raw === undefined) return y1;
  if (y2raw.length === 4) return Number(y2raw);
  const century = Math.floor(y1 / 100) * 100;
  let y2 = century + Number(y2raw);
  if (y2 < y1) y2 += 100;
  return y2;
}

export interface MonthHeader {
  line: number;
  month: number;
  year: number;
}

export function findMonthHeaders(
  lines: string[],
  start: number,
  end: number,
): MonthHeader[] {
  const headers: MonthHeader[] = [];
  for (let i = start; i < end; i++) {
    const line = lines[i] as string;
    const m = MONTH_HEADER_RE.exec(line);
    if (!m) continue;
    const monthName = m[1] as string;
    const year = resolveYear(Number(m[2]), m[3]);
    headers.push({
      line: i,
      month: MONTH_NAMES.indexOf(monthName as (typeof MONTH_NAMES)[number]) + 1,
      year,
    });
  }
  return headers;
}

export interface DiaryRegion {
  /** Index of the first month header line. */
  start: number;
  /** Index of the "END OF THE DIARY." line (exclusive end of body content). */
  end: number;
}

export function findDiaryBodyRegion(lines: string[]): DiaryRegion {
  const start = lines.findIndex((l) => MONTH_HEADER_RE.test(l));
  if (start === -1)
    throw new Error(
      "No month header found — is this the expected source text?",
    );
  const end = lines.indexOf(DIARY_END_MARKER);
  if (end === -1) throw new Error(`"${DIARY_END_MARKER}" marker not found`);
  return { start, end };
}
