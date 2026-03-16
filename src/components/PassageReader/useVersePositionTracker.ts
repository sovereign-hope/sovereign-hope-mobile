import { useCallback, useRef } from "react";

export type VersePositionTrackerResult = {
  /** Register a paragraph's Y position (from onLayout) */
  registerParagraphY: (paragraphId: string, y: number) => void;
  /** Register a verse's position relative to its parent paragraph (from onLayout) */
  registerVersePosition: (
    verse: number,
    paragraphId: string,
    relativeY: number
  ) => void;
  /** Register a verse number as known (seen during render) */
  registerKnownVerse: (verse: number) => void;
  /** Register which paragraph a verse belongs to (from render, not onLayout) */
  registerVerseParagraph: (verse: number, paragraphId: string) => void;
  /** Store the native node from a verse-text onLayout event for direct measurement */
  registerVerseNode: (verse: number, node: unknown) => void;
  /** Build a sorted [verse, absoluteY][] snapshot from two-level position data */
  buildVerseAbsoluteY: () => [number, number][];
  /** Convert a screen pageY to scroll-content Y and find the verse there */
  findVerseAtPageY: (
    pageY: number,
    snapshot?: [number, number][]
  ) => number | undefined;
  /**
   * Measure verse-text nodes via measureInWindow to find which verse
   * contains the given pageY. Calls back with the verse number or undefined.
   * This bypasses the derived coordinate system entirely — use it to
   * pre-resolve the verse under the finger before a long-press fires.
   */
  measureVerseAtPageY: (
    pageY: number,
    callback: (verse: number | undefined) => void
  ) => void;
  /** Ref to the pre-built snapshot (set by drag-start for reuse during drag) */
  verseAbsoluteYRef: React.MutableRefObject<[number, number][]>;
  /** Set of known verse numbers (for validation) */
  knownVersesRef: React.RefObject<Set<number>>;
};

/**
 * Two-level coordinate tracking for accurate verse hit-testing.
 *
 * Level 1: paragraph View onLayout.y → Y relative to RenderHtml root
 * Level 2: verse Text onLayout.y → Y relative to parent paragraph
 * Absolute verse Y = paragraphY + verseRelativeY (in "verse space")
 *
 * The contentOffsetRef bridges the gap between scroll-content coordinates
 * (used by touch events) and verse-space coordinates (used by onLayout).
 * Content above the RenderHtml root (heading, close button) creates this
 * offset: verseSpaceY = scrollContentY - contentOffset.
 *
 * For verses whose onLayout never fires (inline Text in Fabric),
 * positions are estimated by distributing verses evenly within their
 * paragraph's Y span using the render-time verse→paragraph mapping.
 */
export const useVersePositionTracker = (
  bookId: string,
  chapter: number,
  containerYRef: React.RefObject<number>,
  scrollOffsetRef: React.MutableRefObject<number>,
  /** Y offset from scroll content top to the verse-position reference frame
   *  (i.e. the RenderHtml root). Accounts for heading, close button, etc. */
  contentOffsetRef: React.RefObject<number>
): VersePositionTrackerResult => {
  const knownVersesRef = useRef<Set<number>>(new Set());
  const paragraphYRef = useRef<Map<string, number>>(new Map());
  const versePositionRef = useRef<Map<number, { pId: string; relY: number }>>(
    new Map()
  );
  const verseToParagraphRef = useRef<Map<number, string>>(new Map());
  const verseAbsoluteYRef = useRef<[number, number][]>([]);
  // Native node refs from verse-text onLayout events, keyed by verse number.
  // Used by measureVerseAtPageY for direct window-coordinate measurement.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verseNodeRef = useRef<Map<number, any>>(new Map());

  // Reset position data when chapter changes (during render, not useEffect,
  // so we don't wipe values that the verse-text renderers just populated)
  const prevChapterRef = useRef({ bookId, chapter });
  if (
    prevChapterRef.current.bookId !== bookId ||
    prevChapterRef.current.chapter !== chapter
  ) {
    prevChapterRef.current = { bookId, chapter };
    knownVersesRef.current = new Set();
    paragraphYRef.current = new Map();
    versePositionRef.current = new Map();
    verseToParagraphRef.current = new Map();
    verseAbsoluteYRef.current = [];
    verseNodeRef.current = new Map();
  }

  // ---------------------------------------------------------------------------
  // Registration callbacks (called by renderers during layout/render)
  // ---------------------------------------------------------------------------

  const registerParagraphY = useCallback((paragraphId: string, y: number) => {
    paragraphYRef.current.set(paragraphId, y);
  }, []);

  const registerVersePosition = useCallback(
    (verse: number, paragraphId: string, relativeY: number) => {
      // Keep the topmost (minimum) Y for each verse. Poetry verses may
      // have multiple <verse-text> elements (one per line), and onLayout
      // fires for each. Using the topmost position ensures tap hit-testing
      // maps to the correct verse when tapping the first visible line.
      const existing = versePositionRef.current.get(verse);
      if (!existing || relativeY < existing.relY) {
        versePositionRef.current.set(verse, {
          pId: paragraphId,
          relY: relativeY,
        });
      }
    },
    []
  );

  const registerKnownVerse = useCallback((verse: number) => {
    knownVersesRef.current.add(verse);
  }, []);

  const registerVerseParagraph = useCallback(
    (verse: number, paragraphId: string) => {
      verseToParagraphRef.current.set(verse, paragraphId);
    },
    []
  );

  const registerVerseNode = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (verse: number, node: any) => {
      // Keep the first (topmost) node for each verse (poetry may register multiple)
      if (!verseNodeRef.current.has(verse)) {
        verseNodeRef.current.set(verse, node);
      }
    },
    []
  );

  /**
   * Directly measure verse-text native nodes via measureInWindow to find
   * which verse's Y range contains `pageY`. This bypasses the derived
   * coordinate system (onLayout + scroll offset) entirely, using only
   * absolute window coordinates. Async — calls back when complete.
   */
  const measureVerseAtPageY = useCallback(
    (pageY: number, callback: (verse: number | undefined) => void) => {
      const nodes = [...verseNodeRef.current.entries()];
      if (nodes.length === 0) {
        callback(/* verse */ void 0 as number | undefined); // eslint-disable-line unicorn/no-useless-undefined
        return;
      }
      let remaining = nodes.length;
      const results: { verse: number; top: number; height: number }[] = [];
      for (const [verse, node] of nodes) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (typeof node.measureInWindow !== "function") {
          remaining--;
          if (remaining === 0) {
            callback(/* verse */ void 0 as number | undefined); // eslint-disable-line unicorn/no-useless-undefined
          }
          continue;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        node.measureInWindow((_x: number, y: number, _w: number, h: number) => {
          results.push({ verse, top: y, height: h });
          remaining--;
          if (remaining === 0) {
            // Find the verse whose Y range contains pageY
            const hit = results.find(
              (r) => pageY >= r.top && pageY < r.top + r.height
            );

            callback(hit?.verse);
          }
        });
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Hit-testing
  // ---------------------------------------------------------------------------

  /**
   * Build a sorted [verse, absoluteY][] snapshot from the two-level
   * position data (paragraph Y + verse relative Y). For verses whose
   * onLayout never fired (inline Text in Fabric), estimates positions
   * by distributing verses evenly within their paragraph's Y span.
   */
  const buildVerseAbsoluteY = useCallback((): [number, number][] => {
    const entries: [number, number][] = [];
    const measured = new Set<number>();

    // 1. Collect verses that have direct onLayout measurements
    for (const [verse, pos] of versePositionRef.current) {
      const pY = paragraphYRef.current.get(pos.pId) ?? 0;
      entries.push([verse, pY + pos.relY]);
      measured.add(verse);
    }

    // 2. For unmeasured verses, estimate from paragraph membership.
    //    Group unmeasured verses by their paragraph, then distribute
    //    evenly across that paragraph's Y span.
    const sorted = [...knownVersesRef.current].sort((a, b) => a - b);
    const paragraphYs = [...paragraphYRef.current.entries()].sort(
      ([, a], [, b]) => a - b
    );

    // Build paragraph → [unmeasured verses] groups
    const unmeasuredByParagraph = new Map<string, number[]>();
    for (const v of sorted) {
      if (measured.has(v)) continue;
      const pId = verseToParagraphRef.current.get(v);
      if (!pId) continue;
      let group = unmeasuredByParagraph.get(pId);
      if (!group) {
        group = [];
        unmeasuredByParagraph.set(pId, group);
      }
      group.push(v);
    }

    for (const [pId, verses] of unmeasuredByParagraph) {
      const pY = paragraphYRef.current.get(pId);
      if (pY === undefined) continue;

      // Find the next paragraph's Y to compute this paragraph's height
      let nextPY: number | undefined;
      for (const [, y] of paragraphYs) {
        if (y > pY) {
          nextPY = y;
          break;
        }
      }
      const pHeight = nextPY === undefined ? 200 : nextPY - pY; // fallback

      // Distribute verses evenly within the paragraph
      const total = verses.length;
      for (let index = 0; index < total; index++) {
        const y = pY + (index / total) * pHeight;
        entries.push([verses[index], y]);
      }
    }

    entries.sort(([, a], [, b]) => a - b);
    return entries;
  }, []);

  /** Find the verse whose content-Y range contains `contentY`. */
  const findVerseAtContentY = useCallback(
    (contentY: number, snapshot?: [number, number][]): number | undefined => {
      const sorted = snapshot ?? verseAbsoluteYRef.current;
      if (sorted.length === 0) return undefined;

      // Reject taps above the first verse
      if (contentY < sorted[0][1]) return undefined;

      // Reject taps below the last verse (use the gap between the last two
      // verses as an estimate of the last verse's height; fall back to 80px)
      const last = sorted.at(-1)!;
      const secondLast = sorted.at(-2);
      const estimatedVerseHeight = secondLast ? last[1] - secondLast[1] : 80;
      if (contentY > last[1] + estimatedVerseHeight) return undefined;

      // Find last verse whose Y <= contentY
      let result = sorted[0][0];
      for (const [v, y] of sorted) {
        if (y <= contentY) result = v;
        else break;
      }
      return result;
    },
    []
  );

  /** Convert a screen pageY to verse-space Y and find the verse there. */
  const findVerseAtPageY = useCallback(
    (pageY: number, snapshot?: [number, number][]): number | undefined => {
      const containerY = containerYRef.current ?? 0;
      const scrollOffset = scrollOffsetRef.current ?? 0;
      const contentOffset = contentOffsetRef.current ?? 0;
      // Convert window coordinate → scroll content Y → verse-space Y
      // by subtracting the offset from scroll content top to RenderHtml root
      const touchContentY = pageY - containerY + scrollOffset - contentOffset;

      return findVerseAtContentY(touchContentY, snapshot);
    },
    [containerYRef, scrollOffsetRef, contentOffsetRef, findVerseAtContentY]
  );

  return {
    registerParagraphY,
    registerVersePosition,
    registerKnownVerse,
    registerVerseParagraph,
    registerVerseNode,
    buildVerseAbsoluteY,
    findVerseAtPageY,
    measureVerseAtPageY,
    verseAbsoluteYRef,
    knownVersesRef,
  };
};
