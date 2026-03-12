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

    // Content before the first verse marker (leave unwrapped)
    const firstMarkerIndex = markers[0].index;
    if (firstMarkerIndex > 0) {
      parts.push(inner.slice(0, firstMarkerIndex));
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
 * Group consecutive poetry line spans that share the same verse ID into
 * a single `<verse-text>` wrapper so the tap target covers the entire
 * verse, not just one line.
 */
const wrapPoetryLines = (html: string): string => {
  const matches = [...html.matchAll(POETRY_LINE_RE)];
  if (matches.length === 0) return html;

  // Group consecutive matches by verse ID
  const groups: { verseId: string; start: number; end: number }[] = [];

  for (const match of matches) {
    const verseId = match[2];
    const start = match.index;
    const end = start + match[0].length;

    const lastGroup = groups.at(-1);
    if (lastGroup && lastGroup.verseId === verseId) {
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
