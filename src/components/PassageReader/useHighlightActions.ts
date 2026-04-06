import { useCallback, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { selectAuthUser } from "src/redux/authSlice";
import {
  selectHighlightsForChapter,
  buildHighlightLookup,
  addHighlight as addHighlightAction,
  removeHighlight as removeHighlightAction,
  updateHighlightColor as updateHighlightColorAction,
  updateHighlightRange as updateHighlightRangeAction,
  updateHighlightText as updateHighlightTextAction,
} from "src/redux/highlightsSlice";
import {
  setHighlightDoc,
  updateHighlightColorDoc,
  updateHighlightRangeDoc,
  deleteHighlightDoc,
  updateHighlightTextDoc,
} from "src/services/highlights";
import { fetchVersePlainText } from "src/services/esv";
import { DEFAULT_HIGHLIGHT_COLOR } from "src/constants/highlights";
import type { Highlight, HighlightColor } from "src/types/highlights";
import { generateLocalId } from "src/utils/generateLocalId";

/** Fire-and-forget Firestore write with consistent error logging. */
const fireAndForget = (promise: Promise<unknown>): void => {
  void promise.catch((error) => {
    console.warn("[Highlights] Firestore write-through failed:", error);
  });
};

export type HighlightActionsResult = {
  highlightLookup: Record<string, HighlightColor>;
  highlightKey: string;
  colorPickerTarget: Highlight | undefined;
  findHighlightForVerse: (verse: number) => Highlight | undefined;
  findAdjacentHighlight: (verse: number) => Highlight | undefined;
  expandHighlight: (existing: Highlight, verse: number) => Highlight;
  createHighlight: (verse: number) => Highlight;
  createRangeHighlight: (
    startVerse: number,
    endVerse: number
  ) => Highlight | undefined;
  updateHighlightRange: (
    id: string,
    startVerse: number,
    endVerse: number
  ) => void;
  openColorPicker: (highlight: Highlight) => void;
  dismissColorPicker: () => void;
  changeColor: (color: HighlightColor) => void;
  deleteHighlight: () => void;
};

/**
 * Manages highlight CRUD operations (Redux + Firestore write-through)
 * and color picker UI state.
 */
export const useHighlightActions = (
  bookId: string,
  chapter: number
): HighlightActionsResult => {
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

  const chapterHighlightsRef = useRef(chapterHighlights);
  chapterHighlightsRef.current = chapterHighlights;

  const highlightLookup = useMemo(
    () => buildHighlightLookup(chapterHighlights),
    [chapterHighlights]
  );

  const highlightKey = useMemo(
    () =>
      chapterHighlights
        .map((h) => `${h.id}:${h.color}:${h.startVerse}-${h.endVerse}`)
        .join("|"),
    [chapterHighlights]
  );

  // ---------------------------------------------------------------------------
  // Query helpers
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Mutations (Redux + Firestore)
  // ---------------------------------------------------------------------------

  const updateHighlightRange = useCallback(
    (id: string, startVerse: number, endVerse: number) => {
      dispatch(updateHighlightRangeAction({ id, startVerse, endVerse }));
      if (user?.uid) {
        fireAndForget(
          updateHighlightRangeDoc(user.uid, id, startVerse, endVerse)
        );
      }
    },
    [dispatch, user?.uid]
  );

  const expandHighlight = useCallback(
    (existing: Highlight, verse: number): Highlight => {
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

        updateHighlightRange(existing.id, mergedStart, mergedEnd);
        dispatch(removeHighlightAction(otherAdjacent.id));

        if (user?.uid) {
          fireAndForget(deleteHighlightDoc(user.uid, otherAdjacent.id));
        }

        return { ...existing, startVerse: mergedStart, endVerse: mergedEnd };
      }

      // Simple expand
      updateHighlightRange(existing.id, newStart, newEnd);
      return { ...existing, startVerse: newStart, endVerse: newEnd };
    },
    [bookId, chapter, dispatch, updateHighlightRange, user?.uid]
  );

  /** Fetch verse text for a highlight and persist it (fire-and-forget). */
  const fetchAndStoreText = useCallback(
    (highlight: Highlight) => {
      const run = async () => {
        const text = await fetchVersePlainText(
          highlight.bookId,
          highlight.chapter,
          highlight.startVerse,
          highlight.endVerse
        );
        if (!text) return;
        dispatch(updateHighlightTextAction({ id: highlight.id, text }));
        if (user?.uid) {
          await updateHighlightTextDoc(user.uid, highlight.id, text);
        }
      };
      fireAndForget(run());
    },
    [dispatch, user?.uid]
  );

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
        fireAndForget(setHighlightDoc(user.uid, highlight));
      }

      fetchAndStoreText(highlight);

      return highlight;
    },
    [bookId, chapter, dispatch, fetchAndStoreText, user?.uid]
  );

  const createRangeHighlight = useCallback(
    (startVerse: number, endVerse: number): Highlight | undefined => {
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
            fireAndForget(deleteHighlightDoc(user.uid, overlapping[index].id));
          }
        }

        updateHighlightRange(target.id, mergedStart, mergedEnd);
        fetchAndStoreText({
          ...target,
          startVerse: mergedStart,
          endVerse: mergedEnd,
        });
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
        fireAndForget(setHighlightDoc(user.uid, highlight));
      }

      fetchAndStoreText(highlight);

      return highlight;
    },
    [
      bookId,
      chapter,
      dispatch,
      fetchAndStoreText,
      updateHighlightRange,
      user?.uid,
    ]
  );

  // ---------------------------------------------------------------------------
  // Color picker
  // ---------------------------------------------------------------------------

  const openColorPicker = useCallback((highlight: Highlight) => {
    setColorPickerTarget(highlight);
  }, []);

  const dismissColorPicker = useCallback(() => {
    setColorPickerTarget(undefined);
  }, []);

  const changeColor = useCallback(
    (color: HighlightColor) => {
      if (!colorPickerTarget) return;

      dispatch(updateHighlightColorAction({ id: colorPickerTarget.id, color }));

      if (user?.uid) {
        fireAndForget(
          updateHighlightColorDoc(user.uid, colorPickerTarget.id, color)
        );
      }
      setColorPickerTarget(undefined);
    },
    [colorPickerTarget, dispatch, user?.uid]
  );

  const deleteHighlight = useCallback(() => {
    if (!colorPickerTarget) return;

    dispatch(removeHighlightAction(colorPickerTarget.id));

    if (user?.uid) {
      fireAndForget(deleteHighlightDoc(user.uid, colorPickerTarget.id));
    }
    setColorPickerTarget(undefined);
  }, [colorPickerTarget, dispatch, user?.uid]);

  return {
    highlightLookup,
    highlightKey,
    colorPickerTarget,
    findHighlightForVerse,
    findAdjacentHighlight,
    expandHighlight,
    createHighlight,
    createRangeHighlight,
    updateHighlightRange,
    openColorPicker,
    dismissColorPicker,
    changeColor,
    deleteHighlight,
  };
};
