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
} from "src/redux/highlightsSlice";
import {
  addHighlightDoc,
  updateHighlightColorDoc,
  deleteHighlightDoc,
} from "src/services/highlights";
import {
  HIGHLIGHT_COLORS,
  DEFAULT_HIGHLIGHT_COLOR,
} from "src/constants/highlights";
import type { Highlight, HighlightColor } from "src/types/highlights";
import { parseVerseId, buildVerseKey } from "./highlightUtils";
import type { ParsedVerse } from "./highlightUtils";

type TapState =
  | { mode: "idle" }
  | { mode: "first-selected"; verse: ParsedVerse };

export type HighlightRendererResult = {
  renderers: Record<string, CustomBlockRenderer>;
  /** The first-selected verse (if any), for UI feedback */
  pendingVerse: ParsedVerse | undefined;
  /** Cancel the pending first-verse selection */
  cancelSelection: () => void;
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

  const [tapState, setTapState] = useState<TapState>({ mode: "idle" });
  const [colorPickerTarget, setColorPickerTarget] = useState<
    Highlight | undefined
  >();

  // Stable refs for callbacks used in memoized renderer
  const tapStateRef = useRef(tapState);
  tapStateRef.current = tapState;
  const chapterHighlightsRef = useRef(chapterHighlights);
  chapterHighlightsRef.current = chapterHighlights;

  const highlightLookup = useMemo(
    () => buildHighlightLookup(chapterHighlights),
    [chapterHighlights]
  );
  const highlightLookupRef = useRef(highlightLookup);
  highlightLookupRef.current = highlightLookup;

  const colorMode = isDarkMode ? "dark" : "light";

  const createHighlight = useCallback(
    async (startVerse: number, endVerse: number) => {
      if (!user?.uid) return;

      const now = Date.now();
      const data: Omit<Highlight, "id"> = {
        bookId,
        chapter,
        startVerse: Math.min(startVerse, endVerse),
        endVerse: Math.max(startVerse, endVerse),
        color: DEFAULT_HIGHLIGHT_COLOR,
        createdAt: now,
        updatedAt: now,
      };

      // Optimistic update with temp ID
      const tempId = `temp_${now}`;
      dispatch(addHighlightAction({ ...data, id: tempId }));

      try {
        const firestoreId = await addHighlightDoc(user.uid, data);
        // Replace temp with real ID
        dispatch(removeHighlightAction(tempId));
        dispatch(addHighlightAction({ ...data, id: firestoreId }));
      } catch {
        // Revert on failure
        dispatch(removeHighlightAction(tempId));
      }
    },
    [bookId, chapter, dispatch, user?.uid]
  );

  const handleVerseTap = useCallback(
    (parsed: ParsedVerse) => {
      const current = tapStateRef.current;
      if (current.mode === "idle") {
        if (Platform.OS === "ios") void Haptics.selectionAsync();
        setTapState({ mode: "first-selected", verse: parsed });
      } else if (current.mode === "first-selected") {
        // Second tap — create range highlight
        if (Platform.OS === "ios")
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        void createHighlight(current.verse.verse, parsed.verse);
        setTapState({ mode: "idle" });
      }
    },
    [createHighlight]
  );

  const handleVerseLongPress = useCallback((parsed: ParsedVerse) => {
    const key = buildVerseKey(parsed.bookId, parsed.chapter, parsed.verse);
    const color = highlightLookupRef.current[key];
    if (!color) return;

    // Find the highlight that contains this verse
    const highlight = chapterHighlightsRef.current.find(
      (h) =>
        parsed.verse >= h.startVerse &&
        parsed.verse <= h.endVerse &&
        h.bookId === parsed.bookId &&
        h.chapter === parsed.chapter
    );
    if (highlight) {
      if (Platform.OS === "ios")
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setColorPickerTarget(highlight);
    }
  }, []);

  const cancelSelection = useCallback(() => {
    setTapState({ mode: "idle" });
  }, []);

  const dismissColorPicker = useCallback(() => {
    setColorPickerTarget(undefined);
  }, []);

  const changeColor = useCallback(
    (color: HighlightColor) => {
      if (!colorPickerTarget || !user?.uid) return;

      dispatch(updateHighlightColorAction({ id: colorPickerTarget.id, color }));
      void updateHighlightColorDoc(user.uid, colorPickerTarget.id, color);
      setColorPickerTarget(undefined);
    },
    [colorPickerTarget, dispatch, user?.uid]
  );

  const deleteHighlight = useCallback(() => {
    if (!colorPickerTarget || !user?.uid) return;

    dispatch(removeHighlightAction(colorPickerTarget.id));
    void deleteHighlightDoc(user.uid, colorPickerTarget.id);
    setColorPickerTarget(undefined);
  }, [colorPickerTarget, dispatch, user?.uid]);

  // The renderers object is memoized but must update when highlights change
  // so that verse background colors re-render. Including highlightLookup in
  // the deps triggers a TRenderEngine rebuild only on user-initiated highlight
  // actions, which is an acceptable trade-off.
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
            onLongPress={() => handleVerseLongPress(parsed)}
            delayLongPress={400}
            accessibilityRole="button"
            accessibilityLabel={`Verse ${parsed.verse}`}
            accessibilityHint="Tap to select verse for highlighting, long press to edit existing highlight"
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
    [colorMode, handleVerseLongPress, handleVerseTap, highlightLookup]
  );

  return {
    renderers,
    pendingVerse:
      tapState.mode === "first-selected" ? tapState.verse : undefined,
    cancelSelection,
    colorPickerTarget,
    dismissColorPicker,
    changeColor,
    deleteHighlight,
  };
};
