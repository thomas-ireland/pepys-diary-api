import type { DiaryRecord } from "./assemble.js";

function findByPrefix(records: DiaryRecord[], prefix: string): DiaryRecord {
  const hit = records.find((r) => r.entryText.startsWith(prefix));
  if (!hit)
    throw new Error(
      `Manual fix target not found (prefix: ${JSON.stringify(prefix)})`,
    );
  return hit;
}

/**
 * Five source errors that don't fit any generalizable pattern: an OCR misread
 * that broke a comma-list day parse mid-list, three mistyped ordinals in the
 * source itself (confirmed by sequence position against the neighboring
 * dates), and one old-money/date-token collision. Matched by entryText
 * content (robust to incidental line-number drift) rather than by line
 * number, with an assertion that throws loudly if the source text ever
 * changes underneath this.
 */
export function applyManualFixes(records: DiaryRecord[]): DiaryRecord[] {
  // "8th, 9th, Loth, 11th, 12th, 13th." -- "Loth" is an OCR misread of "10th"
  // that broke the comma-list day parser mid-list, so the automated pass only
  // captured [8, 9] and left the rest of the list as stray leading text.
  {
    const r = findByPrefix(records, "Loth, 11th, 12th, 13th. ");
    r.id = "1661-07-08_to_1661-07-13";
    r.dateEnd = "1661-07-13";
    r.entryText = r.entryText.slice("Loth, 11th, 12th, 13th. ".length);
    r.confidence = "low";
  }

  // The source literally has the wrong ordinal in each case, but sequence
  // position (the entries immediately before and after) makes the correct
  // date unambiguous.
  const renumbers: { prefix: string; oldId: string; newId: string }[] = [
    {
      prefix:
        "At the office all the morning. At noon I went by appointment to the Sun in Fish",
      oldId: "1661-11-04",
      newId: "1661-11-14",
    },
    {
      prefix:
        "Sir W. Pen and I did a little business at the office, and so home",
      oldId: "1662-05-10",
      newId: "1662-05-20",
    },
    {
      prefix: "Up, and in Sir W. Batten",
      oldId: "1664-12-05",
      newId: "1664-12-06",
    },
  ];
  for (const fix of renumbers) {
    const r = findByPrefix(records, fix.prefix);
    if (r.id !== fix.oldId) {
      throw new Error(
        `Manual fix mismatch: expected id ${fix.oldId}, found ${r.id}`,
      );
    }
    r.id = fix.newId;
    r.date = fix.newId;
    r.confidence = "low";
  }

  // "2d. change for each." is old-money notation (2 pence, from "...he would
  // give me 3s. / 2d. change for each"), not a date -- it happened to start a
  // physical line via word-wrap and matched the abbreviated-ordinal pattern,
  // colliding with the real Jan 2, 1667 entry. Merge it back into the Jan 28
  // entry it actually belongs to.
  {
    const spurious = findByPrefix(records, "change for each.");
    const target = records.find((r) => r.id === "1667-01-28");
    if (!target) throw new Error("Manual fix target 1667-01-28 not found");
    if (!target.entryText.trimEnd().endsWith("3s.")) {
      throw new Error(
        'Manual fix mismatch: 1667-01-28 does not end with "3s." as expected',
      );
    }
    target.entryText = `${target.entryText.trimEnd()} 2d. ${spurious.entryText}`;
    target.commentary = target.commentary.concat(spurious.commentary);
    target.confidence = "low";
    target.sourceLines = [target.sourceLines[0], spurious.sourceLines[1]];
    records.splice(records.indexOf(spurious), 1);
  }

  return records;
}
