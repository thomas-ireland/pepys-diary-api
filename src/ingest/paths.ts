import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** The raw Project Gutenberg eBook #4200 ("The Diary of Samuel Pepys — Complete"). */
export const SOURCE_PATH = join(here, "../../data/source/pg4200.txt");
