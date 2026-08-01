import { describe, expect, it } from "vitest";
import {
  daysInMonth,
  enumerateDates,
  isLeapYear,
  isoDate,
  isValidYmd,
  nextDay,
  parseIsoDate,
  ymdLessOrEqual,
} from "./calendar.js";

describe("isLeapYear", () => {
  it("treats a year divisible by 4 (not 100) as leap", () => {
    expect(isLeapYear(1660)).toBe(true);
  });

  it("treats a year divisible by 100 (not 400) as not leap", () => {
    expect(isLeapYear(1700)).toBe(false);
  });

  it("treats a year divisible by 400 as leap", () => {
    expect(isLeapYear(2000)).toBe(true);
  });

  it("treats an ordinary non-multiple-of-4 year as not leap", () => {
    expect(isLeapYear(1661)).toBe(false);
  });
});

describe("daysInMonth", () => {
  it("gives February 29 days in a leap year", () => {
    expect(daysInMonth(1660, 2)).toBe(29);
  });

  it("gives February 28 days in a non-leap year", () => {
    expect(daysInMonth(1661, 2)).toBe(28);
  });

  it("gives January 31 days", () => {
    expect(daysInMonth(1660, 1)).toBe(31);
  });

  it("gives April 30 days", () => {
    expect(daysInMonth(1660, 4)).toBe(30);
  });
});

describe("isValidYmd", () => {
  it("accepts a normal date", () => {
    expect(isValidYmd(1660, 6, 15)).toBe(true);
  });

  it("rejects month 13", () => {
    expect(isValidYmd(1660, 13, 1)).toBe(false);
  });

  it("rejects February 30", () => {
    expect(isValidYmd(1660, 2, 30)).toBe(false);
  });

  it("accepts February 29 only in a leap year", () => {
    expect(isValidYmd(1660, 2, 29)).toBe(true);
    expect(isValidYmd(1661, 2, 29)).toBe(false);
  });
});

describe("isoDate", () => {
  it("zero-pads month and day", () => {
    expect(isoDate(1660, 1, 1)).toBe("1660-01-01");
  });

  it("leaves double-digit month/day unpadded beyond width 2", () => {
    expect(isoDate(1669, 12, 31)).toBe("1669-12-31");
  });
});

describe("parseIsoDate", () => {
  it("is the inverse of isoDate", () => {
    expect(parseIsoDate("1660-01-01")).toEqual([1660, 1, 1]);
    expect(parseIsoDate(isoDate(1667, 3, 9))).toEqual([1667, 3, 9]);
  });
});

describe("nextDay", () => {
  it("increments within a month", () => {
    expect(nextDay([1660, 1, 1])).toEqual([1660, 1, 2]);
  });

  it("rolls over a month boundary", () => {
    expect(nextDay([1660, 1, 31])).toEqual([1660, 2, 1]);
  });

  it("rolls over Feb 28 to Feb 29 in a leap year", () => {
    expect(nextDay([1660, 2, 28])).toEqual([1660, 2, 29]);
  });

  it("rolls over Feb 28 to Mar 1 in a non-leap year", () => {
    expect(nextDay([1661, 2, 28])).toEqual([1661, 3, 1]);
  });

  it("rolls over a year boundary", () => {
    expect(nextDay([1660, 12, 31])).toEqual([1661, 1, 1]);
  });
});

describe("ymdLessOrEqual", () => {
  it("compares by year first", () => {
    expect(ymdLessOrEqual([1660, 12, 31], [1661, 1, 1])).toBe(true);
  });

  it("compares by month when years match", () => {
    expect(ymdLessOrEqual([1660, 2, 1], [1660, 1, 1])).toBe(false);
  });

  it("treats equal dates as less-or-equal", () => {
    expect(ymdLessOrEqual([1660, 1, 1], [1660, 1, 1])).toBe(true);
  });
});

describe("enumerateDates", () => {
  it("returns a single date for a same-day range", () => {
    expect(enumerateDates([1660, 1, 1], [1660, 1, 1])).toEqual(["1660-01-01"]);
  });

  it("spans a month boundary", () => {
    expect(enumerateDates([1660, 1, 30], [1660, 2, 1])).toEqual([
      "1660-01-30",
      "1660-01-31",
      "1660-02-01",
    ]);
  });

  it("matches the diary's known full-range day count of 3439", () => {
    expect(enumerateDates([1660, 1, 1], [1669, 5, 31])).toHaveLength(3439);
  });
});
