import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import type {
  GestureResponderEvent,
  LayoutChangeEvent,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import type {
  CustomBlockRenderer,
  CustomTextualRenderer,
} from "react-native-render-html";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { selectAuthUser } from "src/redux/authSlice";
import {
  selectHighlightsForChapter,
  buildHighlightLookup,
  addHighlight as addHighlightAction,
  removeHighlight as removeHighlightAction,
  updateHighlightColor as updateHighlightColorAction,
  updateHighlightRange as updateHighlightRangeAction,
} from "src/redux/highlightsSlice";
import {
  setHighlightDoc,
  updateHighlightColorDoc,
  updateHighlightRangeDoc,
  deleteHighlightDoc,
} from "src/services/highlights";
import {
  HIGHLIGHT_COLORS,
  DEFAULT_HIGHLIGHT_COLOR,
} from "src/constants/highlights";
import type { Highlight, HighlightColor } from "src/types/highlights";
import { generateLocalId } from "src/utils/generateLocalId";
import { parseVerseId, buildVerseKey } from "./highlightUtils";
import type { ParsedVerse } from "./highlightUtils";

// ---------------------------------------------------------------------------
// Drag-selection types
// ---------------------------------------------------------------------------

type DragSelection = {
  anchorVerse: number;
  currentVerse: number;
};

// Context for the current drag-preview range. Verse-text renderers consume
// this to show inline preview backgrounds. Using context (rather than prop
// drilling or re-creating renderers) lets us bypass React.memo: context
// changes trigger re-renders of consumers even when their props are identical.
type DragPreviewRange = { lo: number; hi: number } | null;
// eslint-disable-next-line unicorn/no-null -- React context default
export const DragPreviewContext = createContext<DragPreviewRange>(null);

// Semi-transparent blue used for the inline drag-preview background
const DRAG_PREVIEW_COLOR = "rgba(59, 130, 246, 0.25)";

export type HighlightRendererResult = {
  renderers: Record<string, CustomTextualRenderer | CustomBlockRenderer>;
  /** Stable key that changes when highlights change — use as RenderHtml `key` */
  highlightKey: string;
  /** Open the color picker for a highlighted verse */
  colorPickerTarget: Highlight | undefined;
  /** Page-Y coordinate of the tap that opened the color picker */
  colorPickerPageY: number | undefined;
  /** Dismiss the color picker */
  dismissColorPicker: () => void;
  /** Change color of the picker target */
  changeColor: (color: HighlightColor) => void;
  /** Delete the picker target highlight */
  deleteHighlight: () => void;
  // --- Tap & drag ---
  /** Handle a single tap at a screen coordinate (coordinate-based verse detection) */
  handleTapAtPageY: (pageY: number) => void;
  onDragStart: (pageY: number) => void;
  onDragUpdate: (pageY: number) => void;
  onDragEnd: (lastPageY: number) => void;
  /** Whether a drag selection is in progress (disable scroll) */
  isDragSelecting: boolean;
  /** Verse range currently being drag-selected (for context provider) */
  dragPreviewRange: DragPreviewRange;
};

export const useHighlightRenderer = (
  bookId: string,
  chapter: number,
  isDarkMode: boolean,
  containerYRef: React.RefObject<number>,
  scrollOffsetRef: React.MutableRefObject<number>,
  fontSize: number,
  scrollViewRef: React.RefObject<ScrollView | null>,
  containerHeightRef: React.RefObject<number>
): HighlightRendererResult => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const selectChapterHL = useMemo(
    () => (state: Parameters<typeof selectHighlightsForChapter>[0]) =>
      selectHighlightsForChapter(state, bookId, chapter),
    [bookId, chapter]
  );
  const chapterHighlights = useAppSelector(selectChapterHL);

  const [colorPickerTarget, setColorPickerTarget] = useState<
    Highlight | undefined
  >();
  const [colorPickerPageY, setColorPickerPageY] = useState<
    number | undefined
  >();

  // Stable refs for callbacks used in memoized renderer
  const chapterHighlightsRef = useRef(chapterHighlights);
  chapterHighlightsRef.current = chapterHighlights;

  const highlightLookup = useMemo(
    () => buildHighlightLookup(chapterHighlights),
    [chapterHighlights]
  );
  const highlightLookupRef = useRef(highlightLookup);
  highlightLookupRef.current = highlightLookup;

  // Stable ref for handleVerseTap so the renderer memo doesn't depend on it
  const handleVerseTapRef = useRef<
    (parsed: ParsedVerse, pageY: number) => void
  >(() => {});

  // Drag-selection state
  /* eslint-disable unicorn/no-null -- React ref/state API requires null */
  const dragSelectionRef = useRef<DragSelection | null>(null);
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragPreviewRange, setDragPreviewRange] =
    useState<DragPreviewRange>(null);
  const lastDragVerseRef = useRef<number | null>(null);
  /* eslint-enable unicorn/no-null */
  // Timestamp of the last onPress on verse-text. Used to dedup against the
  // View-level handleTapAtPageY fallback so a single tap isn't processed twice.
  const lastOnPressTimeRef = useRef(0);
  // Timestamp of the last drag-end. Used (along with dragSelectionRef) to
  // suppress the onPress that fires after a drag. We need both because the
  // event ordering between onPress (responder) and onTouchEnd (raw) is not
  // guaranteed — dragSelectionRef catches "onPress fires first", timestamp
  // catches "onPress fires after onDragEnd already cleared the ref".
  const dragEndTimeRef = useRef(0);
  // Capture verse identity from onPressIn (fires at touch-DOWN, before
  // long-press timer). This gives us the exact verse the user is pressing on.
  // eslint-disable-next-line unicorn/no-null -- React ref API requires null
  const lastPressedVerseRef = useRef<number | null>(null);
  // Last known finger pageY during drag — used by auto-scroll to re-run
  // hit-testing when content scrolls under a stationary finger.
  const lastDragPageYRef = useRef(0);
  // Track all verse numbers seen during rendering for clamping.
  // Cleared during render (not useEffect) when chapter changes so we
  // don't wipe values that the verse-text renderers just populated.
  const knownVersesRef = useRef<number[]>([]);
  // Two-level position tracking for accurate drag hit-testing:
  // 1) paragraph View onLayout.y → Y relative to scroll content
  // 2) verse Text onLayout.y → Y relative to parent paragraph
  // Absolute verse Y = paragraphY + verseRelativeY
  const paragraphYRef = useRef<Map<string, number>>(new Map());
  const versePositionRef = useRef<Map<number, { pId: string; relY: number }>>(
    new Map()
  );
  // Snapshot of absolute verse Y positions, computed once at drag start
  const verseAbsoluteYRef = useRef<[number, number][]>([]); // sorted [verse, y][]
  // Auto-scroll RAF handle
  // eslint-disable-next-line unicorn/no-null -- React ref API requires null
  const autoScrollRAFRef = useRef<number | null>(null);
  const autoScrollSpeedRef = useRef(0);

  const prevChapterRef = useRef({ bookId, chapter });
  if (
    prevChapterRef.current.bookId !== bookId ||
    prevChapterRef.current.chapter !== chapter
  ) {
    prevChapterRef.current = { bookId, chapter };
    // eslint-disable-next-line unicorn/no-null
    lastPressedVerseRef.current = null;
    knownVersesRef.current = [];
    paragraphYRef.current = new Map();
    versePositionRef.current = new Map();
    verseAbsoluteYRef.current = [];
  }

  /** Find a highlight that contains the given verse. */
  const findHighlightForVerse = useCallback(
    (verse: number): Highlight | undefined =>
      chapterHighlightsRef.current.find(
        (h) =>
          h.bookId === bookId &&
          h.chapter === chapter &&
          verse >= h.startVerse &&
          verse <= h.endVerse
      ),
    [bookId, chapter]
  );

  /** Find a highlight where the given verse is directly adjacent (±1). */
  const findAdjacentHighlight = useCallback(
    (verse: number): Highlight | undefined =>
      chapterHighlightsRef.current.find(
        (h) =>
          h.bookId === bookId &&
          h.chapter === chapter &&
          (verse === h.startVerse - 1 || verse === h.endVerse + 1)
      ),
    [bookId, chapter]
  );

  /** Expand an existing highlight to include a new verse and merge if it bridges two highlights. */
  const expandHighlight = useCallback(
    (existing: Highlight, verse: number) => {
      const newStart = Math.min(existing.startVerse, verse);
      const newEnd = Math.max(existing.endVerse, verse);

      // Check if expanding bridges to another adjacent highlight
      const otherAdjacent = chapterHighlightsRef.current.find(
        (h) =>
          h.id !== existing.id &&
          h.bookId === bookId &&
          h.chapter === chapter &&
          (newEnd + 1 === h.startVerse || newStart - 1 === h.endVerse)
      );

      if (otherAdjacent) {
        // Merge: expand to cover both highlights, delete the other
        const mergedStart = Math.min(newStart, otherAdjacent.startVerse);
        const mergedEnd = Math.max(newEnd, otherAdjacent.endVerse);

        dispatch(
          updateHighlightRangeAction({
            id: existing.id,
            startVerse: mergedStart,
            endVerse: mergedEnd,
          })
        );
        dispatch(removeHighlightAction(otherAdjacent.id));

        if (user?.uid) {
          void updateHighlightRangeDoc(
            user.uid,
            existing.id,
            mergedStart,
            mergedEnd
          );
          void deleteHighlightDoc(user.uid, otherAdjacent.id);
        }
      } else {
        // Simple expand
        dispatch(
          updateHighlightRangeAction({
            id: existing.id,
            startVerse: newStart,
            endVerse: newEnd,
          })
        );

        if (user?.uid) {
          void updateHighlightRangeDoc(user.uid, existing.id, newStart, newEnd);
        }
      }
    },
    [bookId, chapter, dispatch, user?.uid]
  );

  /** Create a brand-new single-verse highlight and return it. */
  const createHighlight = useCallback(
    (verse: number): Highlight => {
      const now = Date.now();
      const highlight: Highlight = {
        id: generateLocalId(),
        bookId,
        chapter,
        startVerse: verse,
        endVerse: verse,
        color: DEFAULT_HIGHLIGHT_COLOR,
        createdAt: now,
        updatedAt: now,
      };

      dispatch(addHighlightAction(highlight));

      if (user?.uid) {
        void setHighlightDoc(user.uid, highlight).catch((error) => {
          console.warn("[Highlights] Firestore write-through failed:", error);
        });
      }

      return highlight;
    },
    [bookId, chapter, dispatch, user?.uid]
  );

  /** Show the color picker anchored near the tapped verse. */
  const openColorPicker = useCallback((highlight: Highlight, pageY: number) => {
    setColorPickerTarget(highlight);
    setColorPickerPageY(pageY);
  }, []);

  /**
   * Single-tap handler:
   * - Tapping a highlighted verse → open color picker
   * - Tapping an unhighlighted verse adjacent to existing highlight → expand + open picker
   * - Tapping an unhighlighted verse → create highlight + open picker
   */
  const handleVerseTap = useCallback(
    (parsed: ParsedVerse, pageY: number) => {
      const { verse } = parsed;
      console.log("[HL-DEBUG] handleVerseTap called", {
        bookId: parsed.bookId,
        chapter: parsed.chapter,
        verse,
        pageY,
      });

      // 1. Already highlighted → open color picker
      const existingHighlight = findHighlightForVerse(verse);
      if (existingHighlight) {
        if (Platform.OS === "ios")
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        openColorPicker(existingHighlight, pageY);
        return;
      }

      // 2. Adjacent to existing highlight → expand + open picker
      const adjacent = findAdjacentHighlight(verse);
      if (adjacent) {
        if (Platform.OS === "ios")
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        expandHighlight(adjacent, verse);
        openColorPicker(adjacent, pageY);
        return;
      }

      // 3. New standalone highlight + open picker
      if (Platform.OS === "ios") void Haptics.selectionAsync();
      const newHighlight = createHighlight(verse);
      openColorPicker(newHighlight, pageY);
    },
    [
      createHighlight,
      expandHighlight,
      findAdjacentHighlight,
      findHighlightForVerse,
      openColorPicker,
    ]
  );
  handleVerseTapRef.current = handleVerseTap;

  const dismissColorPicker = useCallback(() => {
    setColorPickerTarget(undefined);
    setColorPickerPageY(undefined);
  }, []);

  const changeColor = useCallback(
    (color: HighlightColor) => {
      if (!colorPickerTarget) return;

      dispatch(updateHighlightColorAction({ id: colorPickerTarget.id, color }));

      if (user?.uid) {
        void updateHighlightColorDoc(user.uid, colorPickerTarget.id, color);
      }
      setColorPickerTarget(undefined);
    },
    [colorPickerTarget, dispatch, user?.uid]
  );

  const deleteHighlight = useCallback(() => {
    if (!colorPickerTarget) return;

    dispatch(removeHighlightAction(colorPickerTarget.id));

    if (user?.uid) {
      void deleteHighlightDoc(user.uid, colorPickerTarget.id);
    }
    setColorPickerTarget(undefined);
  }, [colorPickerTarget, dispatch, user?.uid]);

  // ---------------------------------------------------------------------------
  // Position registration (called by renderers during layout)
  // ---------------------------------------------------------------------------

  const registerParagraphY = useCallback((paragraphId: string, y: number) => {
    paragraphYRef.current.set(paragraphId, y);
    console.log("[HL-DEBUG] registerParagraphY", paragraphId, y);
  }, []);

  const registerVersePosition = useCallback(
    (verse: number, paragraphId: string, relativeY: number) => {
      versePositionRef.current.set(verse, {
        pId: paragraphId,
        relY: relativeY,
      });
      console.log(
        "[HL-DEBUG] registerVersePosition",
        verse,
        paragraphId,
        relativeY
      );
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Drag hit-testing helpers
  // ---------------------------------------------------------------------------

  /**
   * Build a sorted [verse, absoluteY][] snapshot from the two-level
   * position data (paragraph Y + verse relative Y). Interpolates
   * missing verses whose onLayout didn't fire (common in Fabric for
   * inline Text children).
   */
  const buildVerseAbsoluteY = useCallback((): [number, number][] => {
    const entries: [number, number][] = [];
    for (const [verse, pos] of versePositionRef.current) {
      const pY = paragraphYRef.current.get(pos.pId) ?? 0;
      entries.push([verse, pY + pos.relY]);
    }
    entries.sort(([, a], [, b]) => a - b);

    const sorted = [...knownVersesRef.current].sort((a, b) => a - b);
    const measured = new Set(entries.map(([v]) => v));
    for (const v of sorted) {
      if (measured.has(v)) continue;
      let prevEntry: [number, number] | undefined;
      let nextEntry: [number, number] | undefined;
      for (const entry of entries) {
        if (entry[0] < v) prevEntry = entry;
        if (entry[0] > v && !nextEntry) nextEntry = entry;
      }
      let y: number;
      if (prevEntry && nextEntry) {
        const frac = (v - prevEntry[0]) / (nextEntry[0] - prevEntry[0]);
        y = prevEntry[1] + frac * (nextEntry[1] - prevEntry[1]);
      } else if (prevEntry) {
        y = prevEntry[1] + 1;
      } else if (nextEntry) {
        y = nextEntry[1] - 1;
      } else {
        continue;
      }
      entries.push([v, y]);
    }
    entries.sort(([, a], [, b]) => a - b);
    return entries;
  }, []);

  /** Find the verse whose content-Y range contains `contentY`. */
  const findVerseAtContentY = useCallback(
    (contentY: number, snapshot?: [number, number][]): number | undefined => {
      const sorted = snapshot ?? verseAbsoluteYRef.current;
      if (sorted.length === 0) return undefined;

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

  /** Convert a screen pageY to scroll-content Y and find the verse there. */
  const findVerseAtPageY = useCallback(
    (pageY: number, snapshot?: [number, number][]): number | undefined => {
      const containerY = containerYRef.current ?? 0;
      const scrollOffset = scrollOffsetRef.current ?? 0;
      const touchContentY = pageY - containerY + scrollOffset;
      return findVerseAtContentY(touchContentY, snapshot);
    },
    [containerYRef, scrollOffsetRef, findVerseAtContentY]
  );

  /**
   * Handle a single tap at a screen coordinate. Uses coordinate-based
   * verse detection instead of relying on nested Text onPress, which
   * doesn't fire reliably in Fabric for inline elements inside a
   * TPhrasing context (multi-verse prose paragraphs).
   */
  const handleTapAtPageY = useCallback(
    (pageY: number) => {
      // Skip if onPress already handled this tap (dedup window 500ms)
      if (Date.now() - lastOnPressTimeRef.current < 500) {
        console.log("[HL-DEBUG] handleTapAtPageY SKIPPED (onPress dedup)");
        return;
      }

      const snapshot = buildVerseAbsoluteY();
      console.log("[HL-DEBUG] handleTapAtPageY", {
        pageY,
        snapshotLen: snapshot.length,
        versePositions: versePositionRef.current.size,
        paragraphPositions: paragraphYRef.current.size,
        containerY: containerYRef.current,
        scrollOffset: scrollOffsetRef.current,
      });
      const verse = findVerseAtPageY(pageY, snapshot);
      if (verse === undefined) {
        console.log("[HL-DEBUG] handleTapAtPageY: no verse found");
        return;
      }
      console.log("[HL-DEBUG] handleTapAtPageY: found verse", verse);
      handleVerseTapRef.current({ bookId, chapter, verse }, pageY);
    },
    [
      bookId,
      chapter,
      buildVerseAbsoluteY,
      findVerseAtPageY,
      containerYRef,
      scrollOffsetRef,
    ]
  );

  // ---------------------------------------------------------------------------
  // Auto-scroll during drag
  // ---------------------------------------------------------------------------

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRAFRef.current !== null) {
      // eslint-disable-line unicorn/no-null
      cancelAnimationFrame(autoScrollRAFRef.current);
    }
    // eslint-disable-next-line unicorn/no-null
    autoScrollRAFRef.current = null;
    autoScrollSpeedRef.current = 0;
  }, []);

  /** Update the drag selection to match the verse under `pageY`. */
  const updateDragVerse = useCallback(
    (pageY: number) => {
      if (!dragSelectionRef.current) return;
      const verse = findVerseAtPageY(pageY);
      if (verse === undefined) return;

      if (verse !== lastDragVerseRef.current) {
        lastDragVerseRef.current = verse;
        dragSelectionRef.current.currentVerse = verse;
        if (Platform.OS === "ios") void Haptics.selectionAsync();
        const lo = Math.min(dragSelectionRef.current.anchorVerse, verse);
        const hi = Math.max(dragSelectionRef.current.anchorVerse, verse);
        setDragPreviewRange({ lo, hi });
      }
    },
    [findVerseAtPageY]
  );

  const runAutoScrollFrame = useCallback(() => {
    const speed = autoScrollSpeedRef.current;
    if (speed === 0 || !dragSelectionRef.current) {
      stopAutoScroll();
      return;
    }

    const newOffset = Math.max(0, (scrollOffsetRef.current ?? 0) + speed);
    const sv = scrollViewRef.current;
    if (sv) {
      // scrollTo works even with scrollEnabled={false} — it only blocks
      // user gesture scrolling, not programmatic scrolling.
      (sv as unknown as ScrollView).scrollTo({ y: newOffset, animated: false });
      // eslint-disable-next-line no-param-reassign -- ref is intentionally mutated by consumer and hook
      scrollOffsetRef.current = newOffset;
    }

    // Re-run verse hit-test: finger hasn't moved but content scrolled under it
    updateDragVerse(lastDragPageYRef.current);

    autoScrollRAFRef.current = requestAnimationFrame(runAutoScrollFrame);
  }, [scrollOffsetRef, scrollViewRef, stopAutoScroll, updateDragVerse]);

  // ---------------------------------------------------------------------------
  // Drag-selection callbacks
  // ---------------------------------------------------------------------------

  /** Create a highlight spanning a range of verses (merging any overlapping). */
  const createRangeHighlight = useCallback(
    (startVerse: number, endVerse: number) => {
      const lo = Math.min(startVerse, endVerse);
      const hi = Math.max(startVerse, endVerse);

      // Find any existing highlights that overlap or are adjacent to the range
      const overlapping = chapterHighlightsRef.current.filter(
        (h) =>
          h.bookId === bookId &&
          h.chapter === chapter &&
          h.startVerse <= hi + 1 &&
          h.endVerse >= lo - 1
      );

      if (overlapping.length > 0) {
        // Merge into the first overlapping highlight, delete the rest
        const target = overlapping[0];
        let mergedStart = Math.min(lo, target.startVerse);
        let mergedEnd = Math.max(hi, target.endVerse);

        for (let index = 1; index < overlapping.length; index++) {
          mergedStart = Math.min(mergedStart, overlapping[index].startVerse);
          mergedEnd = Math.max(mergedEnd, overlapping[index].endVerse);
          dispatch(removeHighlightAction(overlapping[index].id));
          if (user?.uid) {
            void deleteHighlightDoc(user.uid, overlapping[index].id);
          }
        }

        dispatch(
          updateHighlightRangeAction({
            id: target.id,
            startVerse: mergedStart,
            endVerse: mergedEnd,
          })
        );
        if (user?.uid) {
          void updateHighlightRangeDoc(
            user.uid,
            target.id,
            mergedStart,
            mergedEnd
          );
        }

        return target;
      }

      // No overlap — create new
      const now = Date.now();
      const highlight: Highlight = {
        id: generateLocalId(),
        bookId,
        chapter,
        startVerse: lo,
        endVerse: hi,
        color: DEFAULT_HIGHLIGHT_COLOR,
        createdAt: now,
        updatedAt: now,
      };

      dispatch(addHighlightAction(highlight));
      if (user?.uid) {
        void setHighlightDoc(user.uid, highlight).catch((error) => {
          console.warn("[Highlights] Firestore write-through failed:", error);
        });
      }

      return highlight;
    },
    [bookId, chapter, dispatch, user?.uid]
  );

  const onDragStart = useCallback(
    (pageY: number) => {
      // Determine anchor verse via coordinate-based hit testing instead
      // of relying on onPressIn (which doesn't fire reliably in Fabric
      // for inline Text elements inside a TPhrasing context).
      const snapshot = buildVerseAbsoluteY();
      const anchorVerse =
        findVerseAtPageY(pageY, snapshot) ?? lastPressedVerseRef.current;
      if (anchorVerse === null || anchorVerse === undefined) return;

      const sorted = [...knownVersesRef.current].sort((a, b) => a - b);
      if (sorted.length === 0 || !sorted.includes(anchorVerse)) return;

      verseAbsoluteYRef.current = snapshot;

      // Store finger position for auto-scroll hit-testing
      lastDragPageYRef.current = pageY;

      if (Platform.OS === "ios")
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      dragSelectionRef.current = { anchorVerse, currentVerse: anchorVerse };
      lastDragVerseRef.current = anchorVerse;
      setIsDragSelecting(true);
      setDragPreviewRange({ lo: anchorVerse, hi: anchorVerse });
    },
    [buildVerseAbsoluteY, findVerseAtPageY]
  );

  const onDragUpdate = useCallback(
    (pageY: number) => {
      if (!dragSelectionRef.current) return;

      // Store latest finger position for auto-scroll re-hit-testing
      lastDragPageYRef.current = pageY;

      // Binary-search the pre-sorted absolute-Y snapshot to find the verse
      // under the user's finger — no averaging, no drift.
      updateDragVerse(pageY);

      // --- Auto-scroll hot zones ---
      // When the finger enters a zone near the top or bottom edge of the
      // visible scroll area, start scrolling programmatically so the user
      // can extend the selection beyond the current viewport.
      // Bottom zone is larger to account for the tab bar eating into the
      // visible area; top zone is smaller since there's less obstruction.
      const TOP_EDGE_ZONE = 100; // px from top edge
      const BOTTOM_EDGE_ZONE = 240; // px from bottom edge
      const MAX_SCROLL_SPEED = 8; // px per frame

      const containerY = containerYRef.current ?? 0;
      const containerH = containerHeightRef.current ?? 0;
      const containerBottom = containerY + containerH;

      if (containerH > 0 && pageY > containerBottom - BOTTOM_EDGE_ZONE) {
        // Near bottom — scroll down
        const proximity = Math.min(
          1,
          Math.max(0, 1 - (containerBottom - pageY) / BOTTOM_EDGE_ZONE)
        );
        autoScrollSpeedRef.current = proximity * MAX_SCROLL_SPEED;
        if (autoScrollRAFRef.current === null) {
          // eslint-disable-line unicorn/no-null
          autoScrollRAFRef.current = requestAnimationFrame(runAutoScrollFrame);
        }
      } else if (containerH > 0 && pageY < containerY + TOP_EDGE_ZONE) {
        // Near top — scroll up
        const proximity = Math.min(
          1,
          Math.max(0, 1 - (pageY - containerY) / TOP_EDGE_ZONE)
        );
        autoScrollSpeedRef.current = -(proximity * MAX_SCROLL_SPEED);
        if (autoScrollRAFRef.current === null) {
          // eslint-disable-line unicorn/no-null
          autoScrollRAFRef.current = requestAnimationFrame(runAutoScrollFrame);
        }
      } else {
        // Finger in the safe middle zone — stop auto-scroll
        stopAutoScroll();
      }
    },
    [
      containerYRef,
      containerHeightRef,
      updateDragVerse,
      runAutoScrollFrame,
      stopAutoScroll,
    ]
  );

  const onDragEnd = useCallback(
    (lastPageY: number) => {
      stopAutoScroll();
      dragEndTimeRef.current = Date.now();

      const sel = dragSelectionRef.current;
      /* eslint-disable unicorn/no-null */
      dragSelectionRef.current = null;
      lastDragVerseRef.current = null;
      setIsDragSelecting(false);
      setDragPreviewRange(null);
      /* eslint-enable unicorn/no-null */

      if (!sel) return;

      const lo = Math.min(sel.anchorVerse, sel.currentVerse);
      const hi = Math.max(sel.anchorVerse, sel.currentVerse);
      const created = createRangeHighlight(lo, hi);
      if (created) {
        // Place color picker near where the user's finger ended
        openColorPicker(created, lastPageY);
      }
    },
    [createRangeHighlight, openColorPicker, stopAutoScroll]
  );

  // Stable key that changes when highlights for this chapter change.
  const highlightKey = useMemo(
    () =>
      chapterHighlights
        .map((h) => `${h.id}:${h.color}:${h.startVerse}-${h.endVerse}`)
        .join("|"),
    [chapterHighlights]
  );

  const renderers = useMemo(
    () => ({
      // --- Paragraph block renderer ---
      // Tracks each <p> element's Y position relative to scroll content.
      // This is the first level of the two-level coordinate chain:
      // absoluteVerseY = paragraphY + verseRelativeY
      p: (({ TDefaultRenderer, tnode, ...props }) => {
        const pId = tnode.id || `p-${tnode.nodeIndex}`;
        return (
          <TDefaultRenderer
            tnode={tnode}
            {...props}
            nativeProps={
              {
                ...props.nativeProps,
                onLayout: (e: LayoutChangeEvent) => {
                  registerParagraphY(pId, e.nativeEvent.layout.y);
                },
              } as typeof props.nativeProps
            }
          />
        );
      }) as CustomBlockRenderer,

      // --- Verse-text inline renderer ---
      "verse-text": (({ TDefaultRenderer, tnode, ...props }) => {
        const id = tnode.id;
        if (!id) {
          return <TDefaultRenderer tnode={tnode} {...props} />;
        }

        const parsed = parseVerseId(id);
        if (!parsed) {
          return <TDefaultRenderer tnode={tnode} {...props} />;
        }

        // Register this verse number so we know the full set for clamping
        if (!knownVersesRef.current.includes(parsed.verse)) {
          knownVersesRef.current.push(parsed.verse);
        }

        // Determine parent paragraph ID for two-level position tracking
        const pId = tnode.parent?.id || `p-${tnode.parent?.nodeIndex ?? 0}`;

        // eslint-disable-next-line react-hooks/rules-of-hooks -- always called (early return above is before any hooks)
        const dragRange = useContext(DragPreviewContext);
        const isInDragRange =
          dragRange !== null && // eslint-disable-line unicorn/no-null
          parsed.verse >= dragRange.lo &&
          parsed.verse <= dragRange.hi;

        const verseKey = buildVerseKey(
          parsed.bookId,
          parsed.chapter,
          parsed.verse
        );
        const lookup = highlightLookupRef.current;
        const highlightColor = lookup[verseKey];
        const mode = isDarkMode ? "dark" : "light";

        // Drag preview takes priority so the user sees the selection clearly
        const bgColor = isInDragRange
          ? DRAG_PREVIEW_COLOR
          : highlightColor
          ? HIGHLIGHT_COLORS[highlightColor][mode]
          : undefined;

        return (
          <TDefaultRenderer
            tnode={tnode}
            {...props}
            nativeProps={
              {
                ...props.nativeProps,
                // Second level of coordinate chain: verse Y relative to parent paragraph
                onLayout: (e: LayoutChangeEvent) => {
                  registerVersePosition(
                    parsed.verse,
                    pId,
                    e.nativeEvent.layout.y
                  );
                },
              } as typeof props.nativeProps
            }
            textProps={{
              ...props.textProps,
              suppressHighlighting: true,
            }}
            onPress={(e: GestureResponderEvent) => {
              console.log("[HL-DEBUG] verse-text onPress fired", {
                verse: parsed.verse,
                pageY: e.nativeEvent.pageY,
                dragActive: !!dragSelectionRef.current,
                dragEndAge: Date.now() - dragEndTimeRef.current,
              });
              // Suppress taps that arrive right after a drag-end
              if (dragSelectionRef.current) return;
              if (Date.now() - dragEndTimeRef.current < 300) return;
              lastOnPressTimeRef.current = Date.now();
              handleVerseTapRef.current(parsed, e.nativeEvent.pageY);
            }}
            style={[
              props.style,
              bgColor ? { backgroundColor: bgColor } : undefined,
            ]}
          />
        );
      }) as CustomTextualRenderer,
    }),
    // Use refs for values that change frequently to keep renderers stable
    // and avoid costly RenderHTML tree re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDarkMode]
  );

  return {
    renderers,
    highlightKey,
    colorPickerTarget,
    colorPickerPageY,
    dismissColorPicker,
    changeColor,
    deleteHighlight,
    handleTapAtPageY,
    onDragStart,
    onDragUpdate,
    onDragEnd,
    isDragSelecting,
    dragPreviewRange,
  };
};
