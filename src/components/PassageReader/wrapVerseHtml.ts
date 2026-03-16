/**
 * Pre-process ESV HTML to wrap each verse's content in an inline
 * `<verse-text>` element so highlights can target individual verses
 * without breaking the literary paragraph structure.
 *
 * **Prose** — The ESV API returns literary paragraphs where one `<p>` may
 * contain multiple verses:
 *
 *   <p id="p01001001_01-1" class="virtual">
 *     <b class="chapter-num" id="v01001001-1">1:1 </b>First verse text...
 *     <b class="verse-num" id="v01001002-1">2 </b>Second verse text...
 *   </p>
 *
 * **Poetry** — Poetry sections use `<p class="block-indent">` with each
 * line as a `<span id="p29003009_01-1" class="line">`. Multiple spans
 * share the same verse ID for multi-line poetry.
 *
 * After wrapping, each verse gets its own `<verse-text>` so highlighting
 * and tap targets operate at the individual verse level while preserving
 * the natural paragraph/poetry flow.
 */

/** Prose: <p> tags containing verse markers */
const P_TAG_RE = /<p\s+([^>]*id="p\d{8}[^"]*"[^>]*)>([\S\s]*?)<\/p>/g;

const VERSE_MARKER_RE = /<b[^>]+id="v(\d{8})-(\d+)"[^>]*>/g;

/** Poetry: <span> tags with verse IDs and "line" class */
const POETRY_LINE_RE =
  /(<span\s+id="(p\d{8}_\d+-\d+)"\s+class="[^"]*line[^"]*">)([\S\s]*?)<\/span>/g;

const wrapProseVerses = (html: string): string =>
  html.replaceAll(P_TAG_RE, (fullMatch, attrs: string, inner: string) => {
    const markers = [...inner.matchAll(VERSE_MARKER_RE)];

    if (markers.length === 0) return fullMatch;

    const parts: string[] = [];

    // Content before the first verse marker — this is a verse continuation
    // when the <p> tag's ID encodes a different verse than the first marker.
    // e.g. <p id="p01003001_03-1">...continuation of v1... <b id="v01003002-1">2 </b>...
    const firstMarkerIndex = markers[0].index;
    if (firstMarkerIndex > 0) {
      const pIdMatch = attrs.match(/id="p(\d{8})_(\d+)-(\d+)"/);
      const firstMarkerRef = markers[0][1]; // e.g. "01003002"
      if (pIdMatch && pIdMatch[1] !== firstMarkerRef) {
        // The <p> tag's verse differs from the first marker → wrap as continuation
        const verseRef = pIdMatch[1];
        const part = pIdMatch[3];
        const verseId = `v${verseRef}_01-${part}`;
        parts.push(
          `<verse-text id="${verseId}">${inner.slice(
            0,
            firstMarkerIndex
          )}</verse-text>`
        );
      } else {
        parts.push(inner.slice(0, firstMarkerIndex));
      }
    }

    for (let index = 0; index < markers.length; index++) {
      const start = markers[index].index;
      const end =
        index < markers.length - 1 ? markers[index + 1].index : inner.length;

      const verseRef = markers[index][1]; // e.g. "01001002"
      const part = markers[index][2]; // e.g. "1"
      // Use "v" prefix (not "p") to avoid duplicate IDs with the parent <p>
      // tag, whose ID also starts with "p". parseVerseId handles both prefixes.
      const verseId = `v${verseRef}_01-${part}`;

      parts.push(
        `<verse-text id="${verseId}">${inner.slice(start, end)}</verse-text>`
      );
    }

    return `<p ${attrs}>${parts.join("")}</p>`;
  });

/**
 * Extract the verse portion from a poetry span ID. The full ID format is
 * `p{8digits}_{indentLevel}-{appearance}` where different lines of the
 * same verse may have different indent/appearance suffixes. The verse is
 * identified by the first 9 characters: `p` + 8-digit book-chapter-verse.
 */
const poetryVerseKey = (spanId: string): string => spanId.slice(0, 9);

/**
 * Group consecutive poetry line spans that belong to the same verse into
 * a single `<verse-text>` wrapper so the tap target covers the entire
 * verse, not just one line. Grouping uses the verse portion of the span
 * ID (first 9 chars) so that lines with different indent/appearance
 * suffixes (e.g. `_01-1` vs `_02-1`) are still grouped together.
 */
const wrapPoetryLines = (html: string): string => {
  const matches = [...html.matchAll(POETRY_LINE_RE)];
  if (matches.length === 0) return html;

  // Group consecutive matches by verse (first 9 chars of span ID)
  const groups: { verseId: string; start: number; end: number }[] = [];

  for (const match of matches) {
    const verseId = match[2];
    const verseKey = poetryVerseKey(verseId);
    const start = match.index;
    const end = start + match[0].length;

    const lastGroup = groups.at(-1);
    if (lastGroup && poetryVerseKey(lastGroup.verseId) === verseKey) {
      // Extend the group to include this match (and content between, e.g. <br />)
      lastGroup.end = end;
    } else {
      groups.push({ verseId, start, end });
    }
  }

  // Build result with <verse-text> wrappers around each group
  let result = "";
  let lastEnd = 0;

  for (const group of groups) {
    result += html.slice(lastEnd, group.start);
    result += `<verse-text id="${group.verseId}">`;
    result += html.slice(group.start, group.end);
    result += "</verse-text>";
    lastEnd = group.end;
  }

  result += html.slice(lastEnd);

  return result;
};

export const wrapVerseHtml = (html: string): string =>
  wrapPoetryLines(wrapProseVerses(html));
