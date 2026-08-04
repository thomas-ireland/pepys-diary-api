import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** The raw Project Gutenberg eBook #4200 ("The Diary of Samuel Pepys — Complete"). */
export const SOURCE_PATH = join(here, "../../data/source/pg4200.txt");

/**
 * SHA-256 of the exact source we parse against. Every downstream count and
 * invariant is derived from this precise text, so if the file ever changes the
 * whole pipeline's ground truth is invalidated — this test fails loudly first.
 */
export const SOURCE_SHA256 =
  "1d8c7943d9159e4e40d98e5fc454c4d771951956863048bfdda9e92fb71f58a1";

/** Where the emitted, corrected output lands. */
export const OUTPUT_PATH = join(here, "../../data/diary.json");
