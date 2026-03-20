import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type { ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import type { Highlight } from "src/types/highlights";
import { getVerseAtPoint } from "verse-hit-test";

export type DragPreviewRange = { lo: number; hi: number } | null;

type DragSelection = {
  anchorVerse: number;
  currentVerse: number;
};

type UseDragSelectionParams = {
  scrollViewRef: React.RefObject<ScrollView | null>;
  containerYRef: React.RefObject<number>;
  containerHeightRef: React.RefObject<number>;
  scrollOffsetRef: React.MutableRefObject<number>;
  findVerseAtPageY: (
    pageY: number,
    snapshot?: [number, number][]
  ) => number | undefined;
  buildVerseAbsoluteY: () => [number, number][];
  verseAbsoluteYRef: React.MutableRefObject<[number, number][]>;
  knownVersesRef: React.RefObject<Set<number>>;
  createRangeHighlight: (
    startVerse: number,
    endVerse: number
  ) => Highlight | undefined;
  openColorPicker: (highlight: Highlight) => void;
};

export type DragSelectionResult = {
  onDragStart: (pageY: number, preResolvedVerse?: number) => void;
  onDragUpdate: (pageX: number, pageY: number) => void;
  onDragEnd: () => void;
  isDragSelecting: boolean;
  dragPreviewRange: DragPreviewRange;
  /** Returns true if a tap should be suppressed (drag in progress or just ended) */
  shouldSuppressTap: () => boolean;
};

/**
 * Drag-to-select state machine with auto-scroll.
 *
 * Handles long-press → drag gesture for multi-verse selection.
 * Auto-scrolls when the finger enters hot zones near the top/bottom
 * edges of the container, and re-runs hit-testing as content scrolls
 * under a stationary finger.
 */
export const useDragSelection = ({
  scrollViewRef,
  containerYRef,
  containerHeightRef,
  scrollOffsetRef,
  findVerseAtPageY,
  buildVerseAbsoluteY,
  verseAbsoluteYRef,
  knownVersesRef,
  createRangeHighlight,
  openColorPicker,
}: UseDragSelectionParams): DragSelectionResult => {
  /* eslint-disable unicorn/no-null -- React ref/state API requires null */
  const dragSelectionRef = useRef<DragSelection | null>(null);
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragPreviewRange, setDragPreviewRange] =
    useState<DragPreviewRange>(null);
  const lastDragVerseRef = useRef<number | null>(null);
  const dragEndTimeRef = useRef(0);
  const lastDragPageXRef = useRef(0);
  const lastDragPageYRef = useRef(0);
  const dragStartPageYRef = useRef(0);
  const autoScrollRAFRef = useRef<number | null>(null);
  const autoScrollSpeedRef = useRef(0);
  const isNativeHitTestingRef = useRef(false);
  const pendingHitTestRef = useRef<{ x: number; y: number } | null>(null);
  /* eslint-enable unicorn/no-null */

  // ---------------------------------------------------------------------------
  // Auto-scroll
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

  // Cancel any in-flight RAF on unmount to prevent orphan frames
  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  /** Apply a verse hit result to the drag selection. */
  const applyVerseHit = useCallback((verse: number) => {
    if (!dragSelectionRef.current) return;
    if (verse !== lastDragVerseRef.current) {
      lastDragVerseRef.current = verse;
      dragSelectionRef.current.currentVerse = verse;
      if (Platform.OS === "ios") void Haptics.selectionAsync();
      const lo = Math.min(dragSelectionRef.current.anchorVerse, verse);
      const hi = Math.max(dragSelectionRef.current.anchorVerse, verse);
      setDragPreviewRange({ lo, hi });
    }
  }, []);

  /** Update the drag selection using native hit testing on iOS,
   *  falling back to coordinate math on Android or if native fails. */
  const updateDragVerse = useCallback(
    (pageX: number, pageY: number) => {
      if (!dragSelectionRef.current) return;

      // Throttle: only one native hit test in flight at a time
      if (isNativeHitTestingRef.current) {
        pendingHitTestRef.current = { x: pageX, y: pageY };
        return;
      }

      isNativeHitTestingRef.current = true;

      getVerseAtPoint(pageX, pageY)
        .then((verse) => {
          isNativeHitTestingRef.current = false;

          if (__DEV__) {
            console.log(
              `[native-verse] x=${Math.round(pageX)} y=${Math.round(
                pageY
              )} → verse=${verse}`
            );
          }

          if (verse > 0 && dragSelectionRef.current) {
            applyVerseHit(verse);
          } else {
            // Native hit test failed — fall back to coordinate math
            const fallback = findVerseAtPageY(pageY);
            if (__DEV__) {
              console.log(`[native-verse] fallback → v${fallback}`);
            }
            if (fallback !== undefined) applyVerseHit(fallback);
          }

          // Process queued hit test
          const pending = pendingHitTestRef.current;
          if (pending !== null && dragSelectionRef.current) {
            // eslint-disable-next-line unicorn/no-null
            pendingHitTestRef.current = null;
            updateDragVerse(pending.x, pending.y);
          }
          return;
        })
        .catch(() => {
          isNativeHitTestingRef.current = false;
          // Fall back to coordinate math
          const fallback = findVerseAtPageY(pageY);
          if (fallback !== undefined) applyVerseHit(fallback);
        });
    },
    [applyVerseHit, findVerseAtPageY]
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
    updateDragVerse(lastDragPageXRef.current, lastDragPageYRef.current);

    autoScrollRAFRef.current = requestAnimationFrame(runAutoScrollFrame);
  }, [scrollOffsetRef, scrollViewRef, stopAutoScroll, updateDragVerse]);

  // ---------------------------------------------------------------------------
  // Drag callbacks
  // ---------------------------------------------------------------------------

  const onDragStart = useCallback(
    (pageY: number, preResolvedVerse?: number) => {
      const snapshot = buildVerseAbsoluteY();
      const anchorVerse = preResolvedVerse ?? findVerseAtPageY(pageY, snapshot);
      if (anchorVerse === undefined) return;

      const sorted = [...knownVersesRef.current].sort((a, b) => a - b);
      if (sorted.length === 0 || !sorted.includes(anchorVerse)) return;

      // eslint-disable-next-line no-param-reassign -- ref is intentionally set by consumer
      verseAbsoluteYRef.current = snapshot;

      // Store finger position for auto-scroll hit-testing and dead zone
      lastDragPageYRef.current = pageY;
      dragStartPageYRef.current = pageY;

      if (Platform.OS === "ios")
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      dragSelectionRef.current = { anchorVerse, currentVerse: anchorVerse };
      lastDragVerseRef.current = anchorVerse;
      setIsDragSelecting(true);
      setDragPreviewRange({ lo: anchorVerse, hi: anchorVerse });
    },
    [buildVerseAbsoluteY, findVerseAtPageY, knownVersesRef, verseAbsoluteYRef]
  );

  // Minimum distance from drag start before the coordinate-based verse
  // lookup kicks in. Prevents tiny finger jitter from changing the selection
  // away from the accurate onPressIn-resolved anchor verse.
  const DRAG_DEAD_ZONE_PX = 30;

  const onDragUpdate = useCallback(
    (pageX: number, pageY: number) => {
      if (!dragSelectionRef.current) return;

      // Store latest finger position for auto-scroll re-hit-testing
      lastDragPageXRef.current = pageX;
      lastDragPageYRef.current = pageY;

      // Don't update the verse until the finger has moved meaningfully
      // from the drag start. The coordinate-based verse lookup is
      // inaccurate for inline Text (Fabric), so we stay on the accurate
      // onPressIn anchor until the user deliberately drags.
      if (Math.abs(pageY - dragStartPageYRef.current) < DRAG_DEAD_ZONE_PX) {
        return;
      }

      // Find the verse under the user's finger
      updateDragVerse(pageX, pageY);

      // --- Auto-scroll hot zones ---
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

  const onDragEnd = useCallback(() => {
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
      openColorPicker(created);
    }
  }, [createRangeHighlight, openColorPicker, stopAutoScroll]);

  const shouldSuppressTap = useCallback((): boolean => {
    if (dragSelectionRef.current) return true;
    if (Date.now() - dragEndTimeRef.current < 300) return true;
    return false;
  }, []);

  return {
    onDragStart,
    onDragUpdate,
    onDragEnd,
    isDragSelecting,
    dragPreviewRange,
    shouldSuppressTap,
  };
};
