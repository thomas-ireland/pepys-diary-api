/**
 * The source spaces Mynors Bright's initials inconsistently, so the parser
 * faithfully records both "M. B" and "M.B" for the same man. Collapsing them
 * is an interpretation, so it happens here on the way into the database
 * rather than in the parser, which stays true to the source.
 */
const SOURCE_ALIASES: Record<string, string> = { "M. B": "M.B" };

export function normalizeSource(source: string | null): string | null {
  if (source === null) return null;
  return SOURCE_ALIASES[source] ?? source;
}

/**
 * A DATE column wants a plain calendar day. Pinning to UTC midnight keeps the
 * local timezone from shifting a date across a day boundary on the way in.
 */
export function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}
