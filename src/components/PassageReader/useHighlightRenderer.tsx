import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Platform } from "react-native";
import type { LayoutChangeEvent, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import type {
  CustomBlockRenderer,
  CustomTextualRenderer,
} from "react-native-render-html";
import { HIGHLIGHT_COLORS } from "src/constants/highlights";
import type { Highlight, HighlightColor } from "src/types/highlights";
import { parseVerseId, buildVerseKey } from "./highlightUtils";
import type { ParsedVerse } from "./highlightUtils";
import { useHighlightActions } from "./useHighlightActions";
import { useVersePositionTracker } from "./useVersePositionTracker";
import { useDragSelection } from "./useDragSelection";
import type { DragPreviewRange } from "./useDragSelection";

// Re-export for consumers (PassageReader.tsx)
export type { DragPreviewRange } from "./useDragSelection";

// Context for the current drag-preview range. Verse-text renderers consume
// this to show inline preview backgrounds. Using context (rather than prop
// drilling or re-creating renderers) lets us bypass React.memo: context
// changes trigger re-renders of consumers even when their props are identical.
// eslint-disable-next-line unicorn/no-null -- React context default
export const DragPreviewContext = createContext<DragPreviewRange>(null);

// Context for the current highlight lookup. Verse-text renderers consume
// this so they re-render when highlights change — without tearing down
// the entire RenderHtml tree (which the old `key` prop approach did).
export const HighlightLookupContext = createContext<
  Record<string, HighlightColor>
>({});

// Context for note existence: verse key → true if a note covers that verse.
// Used by the verse-text renderer to add a visual indicator (underline).
export const NoteLookupContext = createContext<Record<string, boolean>>({});

// Semi-transparent blue used for the inline drag-preview background
const DRAG_PREVIEW_COLOR = "rgba(59, 130, 246, 0.25)";

export type HighlightRendererResult = {
  renderers: Record<string, CustomTextualRenderer | CustomBlockRenderer>;
  /** Lookup map for verse highlight colors — provide via HighlightLookupContext */
  highlightLookup: Record<string, HighlightColor>;
  /** Stable key that changes when highlights change */
  highlightKey: string;
  /** Open the color picker for a highlighted verse */
  colorPickerTarget: Highlight | undefined;
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
  onDragEnd: () => void;
  /** Whether a drag selection is in progress (disable scroll) */
  isDragSelecting: boolean;
  /** Verse range currently being drag-selected (for context provider) */
  dragPreviewRange: DragPreviewRange;
};

/**
 * Orchestrator hook that composes highlight actions, verse position tracking,
 * and drag selection into a single API consumed by PassageReader.
 *
 * Builds the RenderHtml custom renderers for `<p>` (paragraph position tracking)
 * and `<verse-text>` (highlight colors, drag preview, tap handling).
 */
export const useHighlightRenderer = (
  bookId: string,
  chapter: number,
  isDarkMode: boolean,
  containerYRef: React.RefObject<number>,
  scrollOffsetRef: React.MutableRefObject<number>,
  _fontSize: number,
  scrollViewRef: React.RefObject<ScrollView | null>,
  containerHeightRef: React.RefObject<number>
): HighlightRendererResult => {
  // --- Compose sub-hooks ---
  const actions = useHighlightActions(bookId, chapter);
  const positions = useVersePositionTracker(
    bookId,
    chapter,
    containerYRef,
    scrollOffsetRef
  );
  const drag = useDragSelection({
    scrollViewRef,
    containerYRef,
    containerHeightRef,
    scrollOffsetRef,
    findVerseAtPageY: positions.findVerseAtPageY,
    buildVerseAbsoluteY: positions.buildVerseAbsoluteY,
    verseAbsoluteYRef: positions.verseAbsoluteYRef,
    knownVersesRef: positions.knownVersesRef,
    createRangeHighlight: actions.createRangeHighlight,
    openColorPicker: actions.openColorPicker,
  });

  // ---------------------------------------------------------------------------
  // Tap handling
  // ---------------------------------------------------------------------------

  // Stable ref so the renderer memo doesn't depend on handleVerseTap identity
  const handleVerseTapRef = useRef<(parsed: ParsedVerse) => void>(() => {});

  /**
   * Single-tap handler:
   * - Color picker open → extend that highlight to include the tapped verse
   * - Tapping a highlighted verse → open color picker
   * - Tapping an unhighlighted verse adjacent to existing highlight → expand + open picker
   * - Tapping an unhighlighted verse → create highlight + open picker
   */
  const handleVerseTap = useCallback(
    (parsed: ParsedVerse) => {
      const { verse } = parsed;

      // 0. Color picker is open → extend that highlight to include the tapped verse
      if (actions.colorPickerTarget) {
        const lo = Math.min(actions.colorPickerTarget.startVerse, verse);
        const hi = Math.max(actions.colorPickerTarget.endVerse, verse);
        if (
          lo !== actions.colorPickerTarget.startVerse ||
          hi !== actions.colorPickerTarget.endVerse
        ) {
          if (Platform.OS === "ios")
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );

          actions.updateHighlightRange(actions.colorPickerTarget.id, lo, hi);

          const updated = {
            ...actions.colorPickerTarget,
            startVerse: lo,
            endVerse: hi,
          };
          actions.openColorPicker(updated);
          return;
        }
        // Tapped same verse range — dismiss the picker
        actions.dismissColorPicker();
        return;
      }

      // 1. Already highlighted → open color picker
      const existing = actions.findHighlightForVerse(verse);
      if (existing) {
        if (Platform.OS === "ios")
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        actions.openColorPicker(existing);
        return;
      }

      // 2. Adjacent to existing highlight → expand + open picker
      const adjacent = actions.findAdjacentHighlight(verse);
      if (adjacent) {
        if (Platform.OS === "ios")
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        const updated = actions.expandHighlight(adjacent, verse);
        actions.openColorPicker(updated);
        return;
      }

      // 3. New standalone highlight + open picker
      if (Platform.OS === "ios") void Haptics.selectionAsync();
      const newHighlight = actions.createHighlight(verse);
      actions.openColorPicker(newHighlight);
    },
    [actions]
  );
  handleVerseTapRef.current = handleVerseTap;

  // Timestamp of the last onPress on verse-text. Used to dedup against the
  // View-level handleTapAtPageY fallback so a single tap isn't processed twice.
  const lastOnPressTimeRef = useRef(0);

  /**
   * Handle a single tap at a screen coordinate. Uses coordinate-based
   * verse detection instead of relying on nested Text onPress, which
   * doesn't fire reliably in Fabric for inline elements inside a
   * TPhrasing context (multi-verse prose paragraphs).
   */
  const handleTapAtPageY = useCallback(
    (pageY: number) => {
      // Skip if onPress already handled this tap (dedup window 500ms)
      if (Date.now() - lastOnPressTimeRef.current < 500) return;

      const snapshot = positions.buildVerseAbsoluteY();
      const verse = positions.findVerseAtPageY(pageY, snapshot);
      if (verse === undefined) return;
      handleVerseTapRef.current({ bookId, chapter, verse });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable callbacks from useVersePositionTracker
    [bookId, chapter, positions.buildVerseAbsoluteY, positions.findVerseAtPageY]
  );

  // ---------------------------------------------------------------------------
  // RenderHtml custom renderers
  // ---------------------------------------------------------------------------

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
                  positions.registerParagraphY(pId, e.nativeEvent.layout.y);
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
        positions.registerKnownVerse(parsed.verse);

        // Determine parent paragraph ID for two-level position tracking
        const pId = tnode.parent?.id || `p-${tnode.parent?.nodeIndex ?? 0}`;

        // Track verse→paragraph mapping during render (always fires).
        // onLayout won't fire for inline Text in Fabric, so this is
        // the only reliable source for paragraph membership.
        positions.registerVerseParagraph(parsed.verse, pId);

        // eslint-disable-next-line react-hooks/rules-of-hooks -- always called (early return above is before any hooks)
        const dragRange = useContext(DragPreviewContext);
        // eslint-disable-next-line react-hooks/rules-of-hooks -- same guard as above
        const lookup = useContext(HighlightLookupContext);
        // eslint-disable-next-line react-hooks/rules-of-hooks -- same guard as above
        const noteLookup = useContext(NoteLookupContext);
        const isInDragRange =
          dragRange !== null && // eslint-disable-line unicorn/no-null
          parsed.verse >= dragRange.lo &&
          parsed.verse <= dragRange.hi;

        const verseKey = buildVerseKey(
          parsed.bookId,
          parsed.chapter,
          parsed.verse
        );
        const highlightColor = lookup[verseKey];
        const hasNote = !!noteLookup[verseKey];
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
                  positions.registerVersePosition(
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
            onPress={() => {
              // Suppress taps that arrive right after a drag-end
              if (drag.shouldSuppressTap()) return;
              lastOnPressTimeRef.current = Date.now();
              handleVerseTapRef.current(parsed);
            }}
            style={[
              props.style,
              bgColor ? { backgroundColor: bgColor } : undefined,
              hasNote
                ? {
                    textDecorationLine: "underline" as const,
                    textDecorationStyle: "solid" as const,
                    textDecorationColor: isDarkMode ? "#888888" : "#CCCCCC",
                  }
                : undefined,
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
    highlightLookup: actions.highlightLookup,
    highlightKey: actions.highlightKey,
    colorPickerTarget: actions.colorPickerTarget,
    dismissColorPicker: actions.dismissColorPicker,
    changeColor: actions.changeColor,
    deleteHighlight: actions.deleteHighlight,
    handleTapAtPageY,
    onDragStart: drag.onDragStart,
    onDragUpdate: drag.onDragUpdate,
    onDragEnd: drag.onDragEnd,
    isDragSelecting: drag.isDragSelecting,
    dragPreviewRange: drag.dragPreviewRange,
  };
};
