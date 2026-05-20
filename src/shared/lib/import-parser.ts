// Filename → {series, chapter} heuristic for bulk PDF import.
//
// Handles common community naming conventions seen in scanlation drops:
//   "Series Name - 001.pdf"
//   "Series_Name_Ch.5.pdf"
//   "Series Name Vol1 Chapter 03 - Subtitle.pdf"
//   "SeriesName_001_extra.pdf"
//   "045.pdf"            → only chapter number
//   "Subtitle Vol2.pdf"  → no chapter → ch = 1

export type ParsedImport = {
  suggestedSeries: string;
  chapterNo: number;
  chapterTitle: string;
};

// Patterns operate on a pre-normalized string where `_`, `.`, `-` are spaces.
// That sidesteps regex word-boundary trouble around underscores.
const CHAPTER_HINT = /(?:^|\s)(?:ch(?:apter)?|ตอนที่|ตอน|episode|ep|#)\s*(\d+(?:\.\d+)?)(?=\s|$)/i;
const TRAILING_NUMBER = /(?:^|\s)(\d{1,4}(?:\.\d+)?)(?:\s*\([^)]*\))?\s*$/;
const VOLUME_HINT = /(?:^|\s)(?:vol(?:ume)?|v)\s*\d+(?=\s|$)/gi;
const SCANLATOR_TAG = /\[[^\]]*\]|\([^)]*\)/g;
// Treat `_`, `-`, whitespace as separators. A `.` is only a separator when it
// isn't sandwiched between digits — that preserves fractional chapter numbers
// like "Ch.5.5" while still squashing "One_Piece_v1.pdf"-style dots.
const SEPARATOR = /[_\s-]+|(?<!\d)\.|\.(?!\d)/g;
const TRAILING_DASH = /[-\s]+$/;
const LEADING_DASH = /^[-\s]+/;

function stripExtension(name: string): string {
  return name.replace(/\.[a-z0-9]{1,5}$/i, '');
}

function squashSeparators(s: string): string {
  return s.replace(SEPARATOR, ' ').trim();
}

export function parseImportFilename(filename: string): ParsedImport {
  const cleaned = stripExtension(filename).replace(SCANLATOR_TAG, ' ').trim();
  if (!cleaned) {
    return { suggestedSeries: 'Untitled', chapterNo: 1, chapterTitle: '' };
  }
  // Normalize so `_`, `.`, `-` all read as spaces; chapter detection is
  // brittle when underscores act like word chars in regex.
  const base = squashSeparators(cleaned);

  let chapterNo: number | null = null;
  let title = '';
  let stem = base;

  // Pass 1 — explicit chapter hint (Ch 5 / Chapter 03 / Ep 4 / #12)
  const hint = stem.match(CHAPTER_HINT);
  if (hint) {
    chapterNo = parseFloat(hint[1]);
    const before = stem.slice(0, hint.index).trim();
    const after = stem.slice((hint.index ?? 0) + hint[0].length).trim();
    stem = before;
    title = after.replace(VOLUME_HINT, '').replace(LEADING_DASH, '').trim();
  }

  // Pass 2 — trailing bare number ("Name 045" or just "045")
  if (chapterNo === null) {
    const tail = stem.match(TRAILING_NUMBER);
    if (tail) {
      chapterNo = parseFloat(tail[1]);
      stem = stem.slice(0, tail.index).trim();
    }
  }

  const series = squashSeparators(stem.replace(VOLUME_HINT, ' '))
    .replace(TRAILING_DASH, '')
    .replace(LEADING_DASH, '');

  return {
    suggestedSeries: series || 'Untitled',
    chapterNo: chapterNo ?? 1,
    chapterTitle: squashSeparators(title),
  };
}

/** Group files that resolve to the same series so the UI can preview lots. */
export function groupByseries(parsed: { name: string; parsed: ParsedImport }[]) {
  const groups = new Map<string, { name: string; parsed: ParsedImport }[]>();
  for (const item of parsed) {
    const key = item.parsed.suggestedSeries.toLowerCase();
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return [...groups.values()].sort((a, b) =>
    a[0].parsed.suggestedSeries.localeCompare(b[0].parsed.suggestedSeries),
  );
}
