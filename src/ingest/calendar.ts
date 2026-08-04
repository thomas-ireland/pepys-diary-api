/**
 * Proleptic-Gregorian calendar arithmetic on plain [year, month, day] tuples —
 * deliberately not `Date`, which is UTC/local-timezone territory we don't need
 * and don't want here. This is the ground-truth backbone for checking that
 * every day in the diary's range is accounted for.
 */
export type Ymd = readonly [year: number, month: number, day: number];

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  const dim = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return dim[month - 1] as number;
}

export function isValidYmd(year: number, month: number, day: number): boolean {
  return (
    month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
  );
}

export function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseIsoDate(date: string): Ymd {
  const [year, month, day] = date.split("-").map(Number);
  return [year as number, month as number, day as number];
}

export function nextDay([year, month, day]: Ymd): Ymd {
  if (day < daysInMonth(year, month)) return [year, month, day + 1];
  if (month < 12) return [year, month + 1, 1];
  return [year + 1, 1, 1];
}

export function ymdLessOrEqual([y1, m1, d1]: Ymd, [y2, m2, d2]: Ymd): boolean {
  if (y1 !== y2) return y1 < y2;
  if (m1 !== m2) return m1 < m2;
  return d1 <= d2;
}

/** Every ISO date from `start` to `end` inclusive. */
export function enumerateDates(start: Ymd, end: Ymd): string[] {
  const dates: string[] = [];
  let cur = start;
  while (ymdLessOrEqual(cur, end)) {
    dates.push(isoDate(...cur));
    cur = nextDay(cur);
  }
  return dates;
}
