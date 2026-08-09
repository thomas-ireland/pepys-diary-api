import { readFileSync } from "node:fs";
import { enumerateDates, parseIsoDate } from "../ingest/calendar.js";
import { OUTPUT_PATH } from "../ingest/paths.js";
import { DIARY_END, DIARY_START } from "../ingest/reconcile.js";
import { prisma } from "./client.js";
import { normalizeSource, toDate } from "./transform.js";

interface DiaryFile {
  sourceSha256: string;
  entries: {
    date: string;
    dateEnd: string;
    dayLabel: string | null;
    entryText: string;
    commentary: { anchor: string; note: string; source: string | null }[];
  }[];
}

export async function seed(): Promise<void> {
  const { entries } = JSON.parse(
    readFileSync(OUTPUT_PATH, "utf8"),
  ) as DiaryFile;

  // Truncate rather than upsert: the database is derived from data/diary.json,
  // so a reseed should reproduce it exactly. RESTART IDENTITY keeps entry ids
  // stable across runs.
  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE commentary, days, entries RESTART IDENTITY CASCADE",
  );

  const covered = new Set<string>();
  for (const entry of entries) {
    const days = enumerateDates(
      parseIsoDate(entry.date),
      parseIsoDate(entry.dateEnd),
    );
    for (const day of days) covered.add(day);

    await prisma.entry.create({
      data: {
        text: entry.entryText,
        // Several days for the two passages Pepys wrote spanning a range;
        // the label belongs to the dated day it was written against.
        days: {
          create: days.map((day, index) => ({
            date: toDate(day),
            label: index === 0 ? entry.dayLabel : null,
          })),
        },
        commentary: {
          create: entry.commentary.map((note, position) => ({
            anchor: note.anchor,
            note: note.note,
            source: normalizeSource(note.source),
            position,
          })),
        },
      },
    });
  }

  // The days he wrote nothing still get a row, so a gap is an answerable
  // fact rather than a missing record.
  const blank = enumerateDates(
    parseIsoDate(DIARY_START),
    parseIsoDate(DIARY_END),
  ).filter((day) => !covered.has(day));
  await prisma.day.createMany({
    data: blank.map((day) => ({ date: toDate(day) })),
  });

  const [dayCount, entryCount, commentaryCount, blankCount] = await Promise.all(
    [
      prisma.day.count(),
      prisma.entry.count(),
      prisma.commentary.count(),
      prisma.day.count({ where: { entryId: null } }),
    ],
  );

  const expectedDays = enumerateDates(
    parseIsoDate(DIARY_START),
    parseIsoDate(DIARY_END),
  ).length;
  const expectedCommentary = entries.reduce(
    (total, e) => total + e.commentary.length,
    0,
  );

  if (
    dayCount !== expectedDays ||
    entryCount !== entries.length ||
    commentaryCount !== expectedCommentary ||
    blankCount !== blank.length
  ) {
    throw new Error(
      `Seed verification failed: days ${dayCount}/${expectedDays}, entries ${entryCount}/${entries.length}, commentary ${commentaryCount}/${expectedCommentary}, blank days ${blankCount}/${blank.length}`,
    );
  }

  console.log(
    `Seeded ${entryCount} entries across ${dayCount} days (${blankCount} with no entry) and ${commentaryCount} commentary notes.`,
  );
}
