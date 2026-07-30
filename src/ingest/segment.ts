/** A run of 5+ leading spaces marks an editorial footnote block. */
export const INDENT_RE = /^ {5,}\S/;

/** The attribution initials a footnote block sometimes ends with, e.g. "--B.]". */
const ATTRIB_RE = /--\s*(B|M\.\s?B|R|Palsgrave)\.\]\s*$/;

/** An inline footnote wrapped in "--[ ... ]--" mid-sentence. */
const INLINE_FOOTNOTE_RE = /--\[([^[\]]*)\](--)?/g;

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

type Segment =
  | { type: "para"; text: string }
  | { type: "foot"; blockRaw: string[]; blockStripped: string[] };

/**
 * Splits one entry's raw lines into paragraphs and footnote blocks. A blank
 * line inside an indented block doesn't end it -- some footnotes span several
 * paragraphs (e.g. quoting verse) -- so a blank line only ends the block if
 * indentation doesn't resume after it.
 */
export function segmentEntry(
  lines: string[],
  segStart: number,
  segEnd: number,
  firstLineOffset: number,
): Segment[] {
  const segs: Segment[] = [];
  let i = segStart;
  let curPara: string[] = [];
  let offset = firstLineOffset;

  function flushPara() {
    if (curPara.length) {
      const joined = curPara.filter((x) => x !== "").join(" ");
      if (joined.trim()) segs.push({ type: "para", text: joined });
      curPara = [];
    }
  }

  while (i < segEnd) {
    const rawLine = lines[i] as string;
    const line = i === segStart ? rawLine.slice(offset) : rawLine;
    offset = 0;

    if (line.trim() === "") {
      flushPara();
      i += 1;
      continue;
    }

    if (INDENT_RE.test(line)) {
      flushPara();
      const blockRaw: string[] = [];
      const blockStripped: string[] = [];
      while (i < segEnd) {
        const l = lines[i] as string;
        if (l.trim() === "") {
          let j = i + 1;
          while (j < segEnd && (lines[j] as string).trim() === "") j += 1;
          if (j < segEnd && INDENT_RE.test(lines[j] as string)) {
            blockRaw.push(l);
            blockStripped.push("");
            i += 1;
            continue;
          }
          break;
        } else if (INDENT_RE.test(l)) {
          blockRaw.push(l);
          blockStripped.push(l.trim());
          i += 1;
        } else {
          break;
        }
      }
      segs.push({ type: "foot", blockRaw, blockStripped });
      continue;
    }

    curPara.push(line.trim());
    i += 1;
  }
  flushPara();
  return segs;
}

interface FootnoteBlock {
  text: string;
  source: string | null;
}

function parseFootnoteBlock(
  blockRaw: string[],
  blockStripped: string[],
): FootnoteBlock {
  const rawSpan = blockRaw.join("\n");
  let text = normalizeWs(blockStripped.join(" "));
  let source: string | null = null;
  const m = ATTRIB_RE.exec(rawSpan);
  if (m) {
    source = (m[1] as string).trim();
    text = text.replace(/--\s*(?:B|M\.\s?B|R|Palsgrave)\.\]\s*$/, "").trim();
    text = text.replace(/--\s*(?:B|M\.\s?B|R|Palsgrave)\.\s*$/, "").trim();
  }
  if (text.startsWith("[")) text = text.slice(1);
  if (text.endsWith("]")) text = text.slice(0, -1);
  return { text: text.trim(), source };
}

interface InlineNote {
  note: string;
  source: string | null;
}

function stripInlineSource(noteInner: string): InlineNote {
  const m = /--\s*(B|M\.\s?B|R|Palsgrave)\.\s*$/.exec(noteInner);
  if (!m) return { note: normalizeWs(noteInner), source: null };
  const source = m[1] as string;
  const note = noteInner.slice(0, m.index).replace(/[ -]+$/, "");
  return { note: normalizeWs(note), source };
}

export interface CommentaryNote {
  /** The last ~8 words of visible text immediately before this note, since the note itself no longer sits there. */
  anchor: string;
  note: string;
  source: string | null;
}

export interface ProcessedEntry {
  entryText: string;
  commentary: CommentaryNote[];
}

const ANCHOR_WORDS = 8;

export function processEntry(
  lines: string[],
  segStart: number,
  segEnd: number,
  firstLineOffset: number,
): ProcessedEntry {
  const segs = segmentEntry(lines, segStart, segEnd, firstLineOffset);
  const entryParas: string[] = [];
  const commentary: CommentaryNote[] = [];
  let accumulatedWords: string[] = [];
  // A block footnote interrupts a sentence mid-flow; once it's removed, the
  // paragraph that follows needs gluing onto the one before rather than
  // starting a new paragraph.
  let mergeWithPrev = false;

  for (const seg of segs) {
    if (seg.type === "para") {
      const text = seg.text;
      const outParts: string[] = [];
      let lastEnd = 0;
      INLINE_FOOTNOTE_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = INLINE_FOOTNOTE_RE.exec(text)) !== null) {
        outParts.push(text.slice(lastEnd, m.index));
        const { note, source } = stripInlineSource(m[1] as string);
        const anchor = (accumulatedWords.join(" ") + " " + outParts.join(" "))
          .split(/\s+/)
          .filter(Boolean)
          .slice(-ANCHOR_WORDS)
          .join(" ");
        commentary.push({ anchor: anchor.trim(), note, source });
        lastEnd = m.index + m[0].length;
      }
      outParts.push(text.slice(lastEnd));
      const visibleText = outParts.join(" ").replace(/\s+/g, " ").trim();

      if (mergeWithPrev && entryParas.length) {
        entryParas[entryParas.length - 1] =
          `${entryParas[entryParas.length - 1]} ${visibleText}`.trim();
      } else {
        entryParas.push(visibleText);
      }
      mergeWithPrev = false;
      accumulatedWords = accumulatedWords.concat(
        visibleText.split(/\s+/).filter(Boolean),
      );
    } else {
      const { text: noteText, source } = parseFootnoteBlock(
        seg.blockRaw,
        seg.blockStripped,
      );
      const anchor = accumulatedWords.slice(-ANCHOR_WORDS).join(" ");
      commentary.push({ anchor: anchor.trim(), note: noteText, source });
      mergeWithPrev = true;
    }
  }

  const entryText = entryParas.filter((p) => p).join("\n\n");
  return { entryText, commentary };
}
