import { describe, expect, it } from "vitest";
import { dayTokenToInt, matchDayLine } from "./dayLine.js";

describe("matchDayLine (against real lines from the source)", () => {
  it("matches the diary's very first entry, abbreviated month + label", () => {
    const m = matchDayLine(
      "Jan. 1st (Lord’s day). This morning (we living lately in the garret,)",
    );
    expect(m?.dayTokens).toEqual(["1st"]);
    expect(m?.label).toBe("Lord’s day");
  });

  it("matches a full month name with no label", () => {
    const m = matchDayLine(
      "February 1st. In the morning went to my office where afterwards the",
    );
    expect(m?.dayTokens).toEqual(["1st"]);
    expect(m?.label).toBeNull();
  });

  it("matches an unpunctuated entry when followed by a capitalized word", () => {
    const m = matchDayLine(
      "31st Office day. Much troubled all this morning in my mind about the",
    );
    expect(m?.dayTokens).toEqual(["31st"]);
  });

  it("rejects a mid-sentence date wrapped to a line start (lowercase continuation)", () => {
    expect(
      matchDayLine("9th of March, 1661.]--I lay tonight with Mr. Shepley"),
    ).toBeNull();
  });

  it("matches the old-style abbreviated ordinal for 2/3/22/23", () => {
    expect(
      matchDayLine("2d. In the morning before I went forth old East brought")
        ?.dayTokens,
    ).toEqual(["2d"]);
  });

  it("rejects old-money notation that isn't one of the four allowed day numbers", () => {
    // "6d." here means sixpence, not the 6th -- must not be read as a date.
    expect(matchDayLine("6d. a pound was demanded")).toBeNull();
  });

  it("stops a comma-list at a token that doesn't parse as a day (the 'Loth' OCR artifact)", () => {
    const m = matchDayLine(
      "8th, 9th, Loth, 11th, 12th, 13th. I fell to work, and my father",
    );
    expect(m?.dayTokens).toEqual(["8th", "9th"]);
  });

  it("matches a full comma-list when every token is well-formed", () => {
    const m = matchDayLine(
      "16th, 17th, 18th, 19th. These four days we spent in",
    );
    expect(m?.dayTokens).toEqual(["16th", "17th", "18th", "19th"]);
  });

  it("matches a capitalized ordinal suffix (the source is inconsistent -- one entry reads '21St.')", () => {
    const m = matchDayLine(
      "21St. Within all day long, helping to put up my hangings in my house",
    );
    expect(m?.dayTokens).toEqual(["21St"]);
  });
});

describe("dayTokenToInt", () => {
  it("reads an ordinary ordinal", () => {
    expect(dayTokenToInt("27th")).toBe(27);
  });

  it("reads an old-style abbreviated ordinal", () => {
    expect(dayTokenToInt("22d")).toBe(22);
  });
});
