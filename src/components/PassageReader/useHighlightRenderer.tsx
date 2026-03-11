import React, { useCallback, useMemo, useRef, useState } from "react";
import { Platform, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import type { CustomBlockRenderer } from "react-native-render-html";
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

export type HighlightRendererResult = {
  renderers: Record<string, CustomBlockRenderer>;
  /** Stable key that changes when highlights change — use as RenderHtml `key` */
  highlightKey: string;
  /** Open the color picker for a highlighted verse */
  colorPickerTarget: Highlight | undefined;
  /** Dismiss the color picker */
  dismissColorPicker: () => void;
  /** Change color of the picker target */
  changeColor: (color: HighlightColor) => void;
  /** Delete the picker target highlight */
  deleteHighlight: () => void;
};

export const useHighlightRenderer = (
  bookId: string,
  chapter: number,
  isDarkMode: boolean
): HighlightRendererResult => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const chapterHighlights = useAppSelector((state) =>
    selectHighlightsForChapter(state, bookId, chapter)
  );

  const [colorPickerTarget, setColorPickerTarget] = useState<
    Highlight | undefined
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

  const colorMode = isDarkMode ? "dark" : "light";

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

  /** Create a brand-new single-verse highlight. */
  const createHighlight = useCallback(
    (verse: number) => {
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
    },
    [bookId, chapter, dispatch, user?.uid]
  );

  /**
   * Single-tap handler:
   * - Tapping a highlighted verse → open color picker
   * - Tapping an unhighlighted verse adjacent to existing highlight → expand it
   * - Tapping an unhighlighted verse → create new single-verse highlight
   */
  const handleVerseTap = useCallback(
    (parsed: ParsedVerse) => {
      const { verse } = parsed;

      // 1. Already highlighted → open color picker
      const existingHighlight = findHighlightForVerse(verse);
      if (existingHighlight) {
        if (Platform.OS === "ios")
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setColorPickerTarget(existingHighlight);
        return;
      }

      // 2. Adjacent to existing highlight → expand
      const adjacent = findAdjacentHighlight(verse);
      if (adjacent) {
        if (Platform.OS === "ios")
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        expandHighlight(adjacent, verse);
        return;
      }

      // 3. New standalone highlight
      if (Platform.OS === "ios") void Haptics.selectionAsync();
      createHighlight(verse);
    },
    [
      createHighlight,
      expandHighlight,
      findAdjacentHighlight,
      findHighlightForVerse,
    ]
  );

  const dismissColorPicker = useCallback(() => {
    setColorPickerTarget(undefined);
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
      p: (({ TDefaultRenderer, tnode, ...props }) => {
        const id = tnode.id;
        if (!id) {
          return <TDefaultRenderer tnode={tnode} {...props} />;
        }

        const parsed = parseVerseId(id);
        if (!parsed) {
          return <TDefaultRenderer tnode={tnode} {...props} />;
        }

        const verseKey = buildVerseKey(
          parsed.bookId,
          parsed.chapter,
          parsed.verse
        );
        const highlightColor = highlightLookup[verseKey];

        const bgColor = highlightColor
          ? HIGHLIGHT_COLORS[highlightColor][colorMode]
          : undefined;

        return (
          <Pressable
            onPress={() => handleVerseTap(parsed)}
            accessibilityRole="button"
            accessibilityLabel={`Verse ${parsed.verse}`}
            accessibilityHint={
              highlightColor
                ? "Tap to edit highlight color or delete"
                : "Tap to highlight this verse"
            }
          >
            <TDefaultRenderer
              tnode={tnode}
              {...props}
              style={[
                props.style,
                bgColor
                  ? {
                      backgroundColor: bgColor,
                      borderRadius: 4,
                      paddingHorizontal: 2,
                    }
                  : undefined,
              ]}
            />
          </Pressable>
        );
      }) as CustomBlockRenderer,
    }),
    [colorMode, handleVerseTap, highlightLookup]
  );

  return {
    renderers,
    highlightKey,
    colorPickerTarget,
    dismissColorPicker,
    changeColor,
    deleteHighlight,
  };
};
