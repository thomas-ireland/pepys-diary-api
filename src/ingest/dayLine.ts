import { INDENT_RE } from "./segment.js";

const MONTH_PREFIXES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "June",
  "July",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
].join("|");

/**
 * Two ways a day is written: the old-style abbreviated ordinal ("2d.", "22d."),
 * restricted to just 2/3/22/23 -- any other "Nd."/"Ns." in the text is old-money
 * notation (pence/shillings, e.g. "6d.") rather than a date -- or the ordinary
 * ordinal suffix ("1st", "27th").
 */
const DAY_TOKEN = "(?:(?:2|3|22|23)d|\\d{1,2}\\s?(?:st|nd|rd|th))";

/**
 * A day line optionally restates its month (only the very first entry of the
 * whole diary abbreviates it: "Jan. 1st"; every other month uses the full
 * name), then one or more comma-separated day tokens (a combined multi-day
 * entry), an optional "(Lord's day)"-style label, and a terminator that is
 * either explicit punctuation or -- when a genuine entry omits it -- a
 * capital letter starting the next sentence. Requiring one or the other
 * rejects false positives: a date mentioned mid-sentence that happens to wrap
 * to the start of a physical line is followed by a lowercase continuation
 * ("...until the / 9th of March, 1661"), not a new capitalized sentence.
 */
const DAY_LINE_RE = new RegExp(
  `^(?:(?:${MONTH_PREFIXES})\\.?\\s+)?` +
    `(?<days>${DAY_TOKEN}(?:,\\s*${DAY_TOKEN})*)` +
    `(?<label>\\s*\\([^)]*\\))?` +
    `(?:(?<term>[.,:])|(?=\\s+[A-Z]))\\s?`,
);

export interface DayLineMatch {
  /** Raw day tokens matched, e.g. ["8th", "9th"] for a comma-separated list. */
  dayTokens: string[];
  /** Day-of-week/holiday label with the parens stripped, if present. */
  label: string | null;
  /** Index into the line where the entry's own text begins. */
  textStart: number;
}

export function dayTokenToInt(token: string): number {
  const digits = /\d+/.exec(token);
  if (!digits) throw new Error(`Not a day token: ${token}`);
  return Number(digits[0]);
}

export function matchDayLine(line: string): DayLineMatch | null {
  const m = DAY_LINE_RE.exec(line);
  if (!m?.groups) return null;
  const label = m.groups.label?.trim().replace(/^\(|\)$/g, "") ?? null;
  return {
    dayTokens: (m.groups.days as string).split(",").map((t) => t.trim()),
    label,
    textStart: m[0].length,
  };
}

export interface DayBoundary {
  line: number;
  days: number[];
  label: string | null;
  /** Index into the boundary line where the entry's own text begins. */
  matchEnd: number;
}

/**
 * Scans every line in a month's block for a day boundary. Footnote-block
 * lines (5+ spaces indented) are skipped -- they can't syntactically match
 * DAY_LINE_RE anyway (it requires the line to start at column 0 with a month
 * name or day token), but skipping them explicitly keeps the intent clear
 * rather than relying on that as an accident of the regex.
 */
export function findDayBoundaries(
  lines: string[],
  blockStart: number,
  blockEnd: number,
): DayBoundary[] {
  const boundaries: DayBoundary[] = [];
  for (let i = blockStart; i < blockEnd; i++) {
    const line = lines[i] as string;
    if (INDENT_RE.test(line)) continue;
    const m = matchDayLine(line);
    if (!m) continue;
    boundaries.push({
      line: i,
      days: m.dayTokens.map(dayTokenToInt),
      label: m.label,
      matchEnd: m.textStart,
    });
  }
  return boundaries;
}
