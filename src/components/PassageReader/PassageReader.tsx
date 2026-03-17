/* eslint-disable react/prop-types */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  Animated,
  View,
  NativeScrollEvent,
  NativeSyntheticEvent,
  LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSelector } from "src/hooks/store";
import { useTheme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { header1, header3 } from "src/style/typography";
import { Ionicons } from "@expo/vector-icons";
import { selectCurrentPassage } from "src/redux/esvSlice";
import type { EsvResponse } from "src/redux/esvSlice";
import RenderHtml, {
  HTMLElementModel,
  HTMLContentModel,
  MixedStyleDeclaration,
} from "react-native-render-html";
import { styles } from "./PassageReader.styles";
import { spacing } from "src/style/layout";
import { selectReadingFontSize } from "src/redux/settingsSlice";
import {
  DragPreviewContext,
  HighlightLookupContext,
  NoteLookupContext,
} from "./useHighlightRenderer";
import type { GestureResponderEvent } from "react-native";
import { useHighlightRenderer } from "./useHighlightRenderer";
import { wrapVerseHtml } from "./wrapVerseHtml";
import { HighlightColorPicker } from "./HighlightColorPicker";

import { selectCurrentPassageCommentaryHTML } from "src/redux/commentarySlice";
import cheerio from "cheerio";
import Collapsible from "react-native-collapsible";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { getPressFeedbackStyle } from "src/style/eink";

const PASSAGE_FADE_DURATION_MS = 220;
const PASSAGE_SCROLL_RESET_FALLBACK_MS = 700;

// Touch gesture thresholds for highlight tap detection
const LONG_PRESS_DELAY_MS = 400;
const MOVE_CANCEL_THRESHOLD_PX = 10;
const SCROLL_DELTA_THRESHOLD_PX = 2;
const FINGER_DELTA_THRESHOLD_PX = 8;

export interface PassageReaderProps {
  /** Heading text shown above the passage */
  heading?: string;
  /** When true, shows the memory hide/reveal button instead of study questions */
  showMemoryButton?: boolean;
  /** Key that triggers scroll-to-top and fade transition when it changes */
  contentKey: number | string;
  /** When true, fades out the passage content (e.g. during navigation) */
  isTransitioning?: boolean;
  /** Height of the mini audio player for bottom padding */
  miniPlayerHeight: number;
  /** Bottom safe area inset */
  bottomInset: number;
  /** Override content width for HTML rendering */
  contentWidth?: number;
  /** When true, adjusts scroll insets automatically */
  adjustsForInsets?: boolean;
  /** Render custom navigation or action buttons at the bottom */
  renderFooter?: () => React.ReactNode;
  /** Optional close button in the top-right */
  onClose?: () => void;
  /** When true, shows study questions and reflection card below the passage */
  showStudyQuestions?: boolean;
  /** Optional ESV response data — when provided, overrides the esvSlice selector */
  passageData?: EsvResponse;
  /** Called when the user changes scroll direction */
  onScrollDirectionChange?: (direction: "up" | "down") => void;
  /** ESV 3-letter book ID (e.g. "JHN") — enables verse highlighting when combined with chapter */
  bookId?: string;
  /** Chapter number — enables verse highlighting when combined with bookId */
  chapter?: number;
  /** Called when the user taps the note button on a highlighted verse */
  onNote?: (startVerse: number, endVerse: number) => void;
  /** Lookup map: "BOOK:chapter:verse" → true if a note covers that verse */
  noteLookup?: Record<string, boolean>;
}

export const PassageReader: React.FunctionComponent<PassageReaderProps> = ({
  heading = "",
  showMemoryButton = false,
  contentKey,
  isTransitioning = false,
  miniPlayerHeight,
  bottomInset,
  contentWidth: contentWidthProp,
  adjustsForInsets = false,
  showStudyQuestions = false,
  renderFooter,
  onClose,
  passageData,
  onScrollDirectionChange,
  bookId,
  chapter,
  onNote,
  noteLookup,
}: PassageReaderProps) => {
  // State
  const [isPressingHideButton, setIsPressingHideButton] = useState(false);
  const [commentaryHTMLTags, setCommentaryHTMLTags] = useState("");
  const [isShowingCommentary, setIsShowingCommentary] = useState(false);

  // Custom hooks
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduxPassage = useAppSelector(selectCurrentPassage);
  const passageText = passageData ?? reduxPassage;
  const commentaryHTML = useAppSelector(selectCurrentPassageCommentaryHTML);
  const fontSize = useAppSelector(selectReadingFontSize);
  const { width: windowWidth } = useWindowDimensions();
  const width = contentWidthProp ?? windowWidth;
  // Commentary sits inside contentCard (padding: lmedium) inside container (padding: large)
  const commentaryWidth = width - 2 * spacing.large - 2 * spacing.lmedium;
  const uiPreferences = useUiPreferences();

  // Track container position, scroll offset, and dimensions (needed by highlight hook)
  const containerYRef = useRef(0);
  const lastScrollOffsetRef = useRef(0);
  const containerHeightRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  // Y offset from scroll content top to the RenderHtml root. Content above
  // the touch handler View (heading, close button) creates a gap between
  // scroll-content coordinates and verse-position coordinates. Computed
  // from synchronous onLayout.y values (no async measureInWindow timing issues).
  const contentOffsetRef = useRef(0);
  // Touch handler View's Y within its parent Animated.View (= heading height)
  const touchHandlerYRef = useRef(0);

  // Highlight rendering — always call hook (hooks rules), use results only when both props are set
  const highlightEnabled = bookId !== undefined && chapter !== undefined;
  const highlightRenderer = useHighlightRenderer(
    bookId ?? "",
    chapter ?? 0,
    theme.dark,
    containerYRef,
    lastScrollOffsetRef,
    fontSize,
    scrollViewRef,
    containerHeightRef,
    contentOffsetRef
  );
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    containerHeightRef.current = event.nativeEvent.layout.height;
    event.target.measureInWindow((_x, y) => {
      containerYRef.current = y;
    });
  }, []);

  // Record the touch handler View's Y within its parent Animated.View.
  // This equals the heading height (if present). Children's onLayout fires
  // before parents, so this value is ready when the parent's onLayout fires.
  const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
    touchHandlerYRef.current = event.nativeEvent.layout.y;
  }, []);

  // Compute the total offset: Animated.View's Y within scroll content
  // (= close button height, if present) + touch handler View's Y within
  // Animated.View (= heading height, if present). Parent onLayout fires
  // after children, so touchHandlerYRef is already set.
  //
  // Also bootstraps lastScrollOffsetRef on mount. When adjustsForInsets is
  // true, iOS sets the resting contentOffset.y to a negative value (the
  // adjusted content inset). But onScroll doesn't fire until the user
  // scrolls, so the ref stays at 0, creating a ~59px offset that shifts
  // coordinate-based verse detection by ~2 verses. We derive the initial
  // scroll offset from the gap between onLayout.y (scroll-content-relative)
  // and measureInWindow (window-relative).
  const handlePassageWrapperLayout = useCallback((event: LayoutChangeEvent) => {
    contentOffsetRef.current =
      event.nativeEvent.layout.y + touchHandlerYRef.current;

    // Bootstrap initial scroll offset before onScroll fires
    const layoutY = event.nativeEvent.layout.y;
    event.target.measureInWindow((_x, windowY) => {
      const containerY = containerYRef.current;
      if (containerY > 0 && lastScrollOffsetRef.current === 0) {
        // scrollContentY = windowY - containerY + scrollOffset
        // At mount, scrollContentY = layoutY, so:
        lastScrollOffsetRef.current = layoutY - (windowY - containerY);
      }
    });
  }, []);

  // Pre-process ESV HTML so each verse is in its own <p> tag for
  // accurate per-verse highlighting and tap targets.
  const rawHtml = passageText?.passages[0] ?? "";
  const passageHtml = useMemo(
    () => (highlightEnabled ? wrapVerseHtml(rawHtml) : rawHtml),
    [highlightEnabled, rawHtml]
  );

  // Ref Hooks
  const animation = useRef(new Animated.Value(1)).current;
  const passageTransitionOpacity = useRef(new Animated.Value(1)).current;
  const transitionOverlayOpacity = useRef(new Animated.Value(0)).current;
  const mountAnimation = useRef(new Animated.Value(0)).current;
  const pendingRevealRef = useRef(false);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevContentKeyRef = useRef<number | string>(contentKey);
  const transitionStartKeyRef = useRef<number | string | null>(null);
  const lastScrollDirectionRef = useRef<"up" | "down">("up");

  const runTiming = React.useCallback(
    (
      animatedValue: Animated.Value,
      toValue: number,
      duration: number,
      useNativeDriver = true
    ) => {
      if (uiPreferences.disableAnimations) {
        animatedValue.setValue(toValue);
        return;
      }

      Animated.timing(animatedValue, {
        toValue,
        duration,
        useNativeDriver,
      }).start();
    },
    [uiPreferences.disableAnimations]
  );

  // Effect hooks
  useEffect(() => {
    runTiming(mountAnimation, 1, 500);
  }, [mountAnimation, runTiming]);

  const fadeInPassage = React.useCallback(() => {
    runTiming(passageTransitionOpacity, 1, PASSAGE_FADE_DURATION_MS);
    runTiming(transitionOverlayOpacity, 0, PASSAGE_FADE_DURATION_MS);
  }, [passageTransitionOpacity, transitionOverlayOpacity, runTiming]);

  const fadeOutPassage = React.useCallback(() => {
    runTiming(passageTransitionOpacity, 0, PASSAGE_FADE_DURATION_MS);
    runTiming(transitionOverlayOpacity, 1, PASSAGE_FADE_DURATION_MS);
  }, [passageTransitionOpacity, transitionOverlayOpacity, runTiming]);

  const revealPassageAfterScrollReset = React.useCallback(() => {
    if (isTransitioning || !pendingRevealRef.current) {
      return;
    }

    pendingRevealRef.current = false;
    // eslint-disable-next-line unicorn/no-null
    transitionStartKeyRef.current = null;
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
    }
    fadeInPassage();
  }, [fadeInPassage, isTransitioning]);

  useEffect(
    () => () => {
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (isTransitioning) {
      transitionStartKeyRef.current = contentKey;
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
      pendingRevealRef.current = false;
      fadeOutPassage();
      return;
    }

    const didContentChangeDuringTransition =
      transitionStartKeyRef.current !== null &&
      transitionStartKeyRef.current !== contentKey;

    if (!didContentChangeDuringTransition && !pendingRevealRef.current) {
      // eslint-disable-next-line unicorn/no-null
      transitionStartKeyRef.current = null;
      fadeInPassage();
    }
  }, [contentKey, fadeInPassage, fadeOutPassage, isTransitioning]);

  useEffect(() => {
    if (prevContentKeyRef.current !== contentKey) {
      prevContentKeyRef.current = contentKey;
      pendingRevealRef.current = true;
      scrollViewRef.current?.scrollTo({
        y: 0,
        animated: !uiPreferences.disableAnimations,
      });
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
      revealTimeoutRef.current = setTimeout(() => {
        revealPassageAfterScrollReset();
      }, PASSAGE_SCROLL_RESET_FALLBACK_MS);
    }
  }, [
    adjustsForInsets,
    contentKey,
    revealPassageAfterScrollReset,
    uiPreferences.disableAnimations,
  ]);

  const handleScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const offsetY = contentOffset.y;

      // Scroll-direction detection: ignore bounce region (offsetY <= 0)
      // and require minimum 4px delta to avoid jitter
      if (onScrollDirectionChange && offsetY > 0) {
        // Hide toolbar when near the bottom to prevent overscroll bounce
        // from showing it over the navigation buttons
        const distanceFromBottom =
          contentSize.height - layoutMeasurement.height - offsetY;
        if (distanceFromBottom < 80) {
          if (lastScrollDirectionRef.current !== "down") {
            lastScrollDirectionRef.current = "down";
            onScrollDirectionChange("down");
          }
        } else {
          const delta = offsetY - lastScrollOffsetRef.current;
          if (Math.abs(delta) > 4) {
            const direction = delta > 0 ? "down" : "up";
            if (direction !== lastScrollDirectionRef.current) {
              lastScrollDirectionRef.current = direction;
              onScrollDirectionChange(direction);
            }
          }
        }
      }

      // Always track scroll offset for highlight drag calculations
      // (must be after direction-change delta check above)
      lastScrollOffsetRef.current = offsetY;

      if (isTransitioning || !pendingRevealRef.current) {
        return;
      }

      if (offsetY <= 1) {
        revealPassageAfterScrollReset();
      }
    },
    [isTransitioning, onScrollDirectionChange, revealPassageAfterScrollReset]
  );

  useEffect(() => {
    if (commentaryHTML) {
      const $ = cheerio.load(commentaryHTML);
      setCommentaryHTMLTags($(".commentary-container").html() ?? "");
    }
  }, [commentaryHTML]);

  // Constants
  const themedStyles = styles({ theme, isEinkMode: uiPreferences.isEinkMode });

  const tagsStyles: Record<string, MixedStyleDeclaration> = useMemo(
    () => ({
      body: {
        whiteSpace: "normal",
        color: theme.colors.text,
        fontSize: fontSize,
      },
      p: {
        marginBottom: spacing.medium,
        lineHeight: fontSize * 1.4,
      },
      h1: {
        fontSize: header1.fontSize,
        fontWeight: "bold",
        marginTop: spacing.large,
        marginBottom: spacing.medium,
        color: theme.colors.text,
      },
      h2: {
        fontSize: header1.fontSize,
        fontWeight: "bold",
        marginTop: spacing.large,
        marginBottom: spacing.medium,
        color: theme.colors.text,
      },
      h3: {
        fontSize: header3.fontSize,
        fontWeight: "bold",
        marginTop: spacing.medium,
        marginBottom: spacing.large,
        color: theme.colors.text,
      },
      a: {
        color: uiPreferences.isEinkMode ? theme.colors.primary : colors.accent,
        textDecorationLine: "none",
        fontWeight: "bold",
      },
      b: {
        fontWeight: "bold",
      },
      strong: {
        fontWeight: "bold",
      },
      em: {
        fontStyle: "italic",
      },
      i: {
        fontStyle: "italic",
      },
      sup: {
        fontSize: fontSize * 0.7,
        color: uiPreferences.isEinkMode ? theme.colors.primary : colors.accent,
        fontWeight: "bold",
      },
      small: {
        fontSize: fontSize * 0.8,
        color: theme.colors.text,
      },
      span: {
        color: theme.colors.text,
      },
      div: {
        marginBottom: spacing.small,
      },
    }),
    [
      fontSize,
      theme.colors.primary,
      theme.colors.text,
      uiPreferences.isEinkMode,
    ]
  );

  const customHTMLElementModels = useMemo(
    () => ({
      note: HTMLElementModel.fromCustomModel({
        tagName: "note",
        contentModel: HTMLContentModel.block,
      }),
      "verse-text": HTMLElementModel.fromCustomModel({
        tagName: "verse-text",
        contentModel: HTMLContentModel.textual,
      }),
    }),
    []
  );

  const commentaryClassesStyles = useMemo(
    () => ({
      comm: {
        marginBottom: spacing.medium,
      },
      versenum: {
        fontWeight: "bold" as const,
      },
      verse: {
        fontStyle: "italic" as const,
        color: uiPreferences.isEinkMode ? theme.colors.primary : colors.red,
        marginVertical: spacing.small,
      },
    }),
    [theme.colors.primary, uiPreferences.isEinkMode]
  );

  // ---------- Long-press + drag via raw touch events ----------
  // Raw onTouchStart/Move/End fire before the responder system,
  // so they coexist with ScrollView without conflict.
  const findHighlightForVerseRef = useRef(
    highlightRenderer.findHighlightForVerse
  );
  findHighlightForVerseRef.current = highlightRenderer.findHighlightForVerse;
  const onNoteRef = useRef(onNote);
  onNoteRef.current = onNote;
  const onDragStartRef = useRef(highlightRenderer.onDragStart);
  onDragStartRef.current = highlightRenderer.onDragStart;
  const onDragUpdateRef = useRef(highlightRenderer.onDragUpdate);
  onDragUpdateRef.current = highlightRenderer.onDragUpdate;
  const onDragEndRef = useRef(highlightRenderer.onDragEnd);
  onDragEndRef.current = highlightRenderer.onDragEnd;

  // eslint-disable-next-line unicorn/no-null -- React ref API requires null
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartYRef = useRef(0);
  const lastTouchYRef = useRef(0);
  const isDragActiveRef = useRef(false);
  const [isDragActive, setIsDragActive] = useState(false);
  // Scroll offset captured at touch-start — if it changes meaningfully
  // by touch-end the gesture was a scroll, not a tap.
  const scrollAtTouchStartRef = useRef(0);
  // Whether any touchMove events fired during this gesture.
  const didMoveRef = useRef(false);
  // Whether the scroll view is decelerating (momentum scroll). A tap
  // during momentum is a "tap to stop", not a highlight tap.
  const isMomentumScrollingRef = useRef(false);
  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      if (!highlightEnabled) return;
      const { pageY } = event.nativeEvent;
      touchStartYRef.current = pageY;
      lastTouchYRef.current = pageY;
      scrollAtTouchStartRef.current = lastScrollOffsetRef.current;
      didMoveRef.current = false;

      longPressTimerRef.current = setTimeout(() => {
        // eslint-disable-next-line unicorn/no-null
        longPressTimerRef.current = null;

        // If the long-pressed verse is already highlighted, open notes
        // instead of starting a drag selection.
        const pressedVerse = highlightRenderer.lastPressInVerseRef.current;
        if (pressedVerse !== undefined && onNoteRef.current) {
          const existing = findHighlightForVerseRef.current(pressedVerse);
          if (existing) {
            onNoteRef.current(existing.startVerse, existing.endVerse);
            return;
          }
        }

        isDragActiveRef.current = true;
        setIsDragActive(true);
        // Use the verse from onPressIn (fires on inline Text in Fabric)
        // as the anchor. Falls back to coordinate-based lookup if
        // onPressIn didn't fire (tap on whitespace).
        onDragStartRef.current(
          lastTouchYRef.current,
          highlightRenderer.lastPressInVerseRef.current
        );
      }, LONG_PRESS_DELAY_MS);
    },
    [highlightEnabled, highlightRenderer.lastPressInVerseRef]
  );

  const handleTouchMove = useCallback((event: GestureResponderEvent) => {
    const { pageY } = event.nativeEvent;
    lastTouchYRef.current = pageY;
    didMoveRef.current = true;

    if (!isDragActiveRef.current) {
      // Not in drag mode — cancel timer if finger moved (user is scrolling)
      if (
        longPressTimerRef.current &&
        Math.abs(pageY - touchStartYRef.current) > MOVE_CANCEL_THRESHOLD_PX
      ) {
        clearTimeout(longPressTimerRef.current);
        // eslint-disable-next-line unicorn/no-null
        longPressTimerRef.current = null;
      }
      return;
    }

    onDragUpdateRef.current(pageY);
  }, []);

  const handleTapRef = useRef(highlightRenderer.handleTapAtPageY);
  handleTapRef.current = highlightRenderer.handleTapAtPageY;

  const handleTouchEnd = useCallback(() => {
    // If long-press timer is still pending, the user did a quick tap
    // (lifted before the 400ms threshold).
    const wasTap = longPressTimerRef.current !== null; // eslint-disable-line unicorn/no-null

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      // eslint-disable-next-line unicorn/no-null
      longPressTimerRef.current = null;
    }
    if (isDragActiveRef.current) {
      isDragActiveRef.current = false;
      setIsDragActive(false);
      onDragEndRef.current();
      return;
    }

    // Quick tap: use coordinate-based hit testing to find the verse.
    // Reject if the finger moved at all (any touchMove event), the scroll
    // position changed, or the finger drifted from its start position.
    // On Android especially, even small scrolls can trigger false taps.
    const scrollDelta = Math.abs(
      lastScrollOffsetRef.current - scrollAtTouchStartRef.current
    );
    const fingerDelta = Math.abs(
      lastTouchYRef.current - touchStartYRef.current
    );
    const isCleanTap =
      !didMoveRef.current &&
      !isMomentumScrollingRef.current &&
      scrollDelta < SCROLL_DELTA_THRESHOLD_PX &&
      fingerDelta < FINGER_DELTA_THRESHOLD_PX;
    if (wasTap && highlightEnabled && isCleanTap) {
      handleTapRef.current(lastTouchYRef.current);
    }
  }, [highlightEnabled]);

  return (
    <View style={{ flex: 1 }} onLayout={handleContainerLayout}>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={[themedStyles.container, { opacity: mountAnimation }]}
        contentInsetAdjustmentBehavior={
          adjustsForInsets ? "automatic" : "never"
        }
        automaticallyAdjustContentInsets={adjustsForInsets}
        automaticallyAdjustsScrollIndicatorInsets={adjustsForInsets}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom:
            (adjustsForInsets ? insets.top : 0) +
            miniPlayerHeight +
            bottomInset,
        }}
        scrollIndicatorInsets={{
          bottom:
            (adjustsForInsets ? insets.top : 0) +
            miniPlayerHeight +
            bottomInset,
        }}
        onScroll={handleScroll}
        onMomentumScrollBegin={() => {
          isMomentumScrollingRef.current = true;
        }}
        onMomentumScrollEnd={() => {
          isMomentumScrollingRef.current = false;
        }}
        scrollEventThrottle={16}
        scrollEnabled={!isDragActive}
      >
        {onClose && (
          <View style={themedStyles.closeButtonRow}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close reading"
              accessibilityHint="Closes the reading detail pane"
              style={({ pressed }) =>
                getPressFeedbackStyle(pressed, uiPreferences.isEinkMode)
              }
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
        )}
        <Animated.View
          style={{ opacity: passageTransitionOpacity }}
          onLayout={handlePassageWrapperLayout}
        >
          {heading.length > 0 && (
            <Text style={themedStyles.title}>{heading}</Text>
          )}
          <View
            onLayout={handleContentLayout}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <Animated.View style={{ opacity: animation }}>
              <DragPreviewContext.Provider
                value={highlightRenderer.dragPreviewRange}
              >
                <HighlightLookupContext.Provider
                  value={highlightRenderer.highlightLookup}
                >
                  <NoteLookupContext.Provider value={noteLookup ?? {}}>
                    <RenderHtml
                      contentWidth={width}
                      source={{ html: passageHtml }}
                      tagsStyles={tagsStyles}
                      customHTMLElementModels={customHTMLElementModels}
                      renderers={
                        highlightEnabled
                          ? highlightRenderer.renderers
                          : undefined
                      }
                    />
                  </NoteLookupContext.Provider>
                </HighlightLookupContext.Provider>
              </DragPreviewContext.Provider>
              {!showMemoryButton && !passageData && commentaryHTML !== "" && (
                <Pressable
                  onPress={() => setIsShowingCommentary(!isShowingCommentary)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    themedStyles.contentCard,
                    getPressFeedbackStyle(pressed, uiPreferences.isEinkMode),
                  ]}
                >
                  <View style={themedStyles.contentCardColumn}>
                    <View style={themedStyles.contentCardRow}>
                      <Text
                        style={{
                          ...themedStyles.contentCardHeader,
                          marginTop: spacing.medium,
                        }}
                      >
                        Matthew Henry&apos;s Concise Commentary
                      </Text>
                      <Ionicons
                        name={
                          isShowingCommentary ? "chevron-up" : "chevron-down"
                        }
                        size={24}
                        color={theme.colors.border}
                      />
                    </View>
                    <Collapsible
                      collapsed={!isShowingCommentary}
                      duration={uiPreferences.disableAnimations ? 0 : 300}
                    >
                      <RenderHtml
                        contentWidth={commentaryWidth}
                        source={{ html: commentaryHTMLTags }}
                        tagsStyles={tagsStyles}
                        classesStyles={commentaryClassesStyles}
                        customHTMLElementModels={customHTMLElementModels}
                      />
                    </Collapsible>
                  </View>
                </Pressable>
              )}
            </Animated.View>
          </View>
          {showStudyQuestions && (
            <View style={themedStyles.contentCard}>
              <View style={themedStyles.contentCardColumn}>
                <Text style={themedStyles.studyQuestionHeader}>
                  Study Questions
                </Text>
                <Text style={themedStyles.studyQuestionSubHeader}>Look Up</Text>
                <Text style={themedStyles.studyQuestion}>
                  What does this passage teach us about the Triune God, his
                  character, and his plan to save us in the gospel?
                </Text>
                <Text style={themedStyles.studyQuestionSubHeader}>Look In</Text>
                <Text style={themedStyles.studyQuestion}>
                  What does this passage teach us about our own hearts and
                  lives, and the world we live in?
                </Text>
                <Text style={themedStyles.studyQuestionSubHeader}>
                  Look Out
                </Text>
                <Text style={themedStyles.studyQuestion}>
                  How does this passage influence the way we should act and
                  think as Christians at home, at work, in relationships or as
                  the church?
                </Text>
                <Text
                  style={{
                    ...themedStyles.studyQuestionHeader,
                    marginTop: spacing.large,
                  }}
                >
                  Thoughts for Reflection
                </Text>
                <Text style={themedStyles.studyQuestion}>
                  Write down one way this passage can influence our emotions and
                  prayer life and be sure to set aside time to pray for that
                  today.
                </Text>
              </View>
            </View>
          )}
          {showMemoryButton && (
            <Pressable
              accessibilityRole="button"
              onPressIn={() => {
                setIsPressingHideButton(true);
                runTiming(animation, 0, 500, false);
              }}
              onPressOut={() => {
                setIsPressingHideButton(false);
                runTiming(animation, 1, 500, false);
              }}
              style={[
                themedStyles.memoryButton,
                {
                  backgroundColor: isPressingHideButton
                    ? uiPreferences.isEinkMode
                      ? theme.colors.background
                      : colors.green
                    : uiPreferences.isEinkMode
                    ? theme.colors.background
                    : colors.red,
                  borderWidth: uiPreferences.isEinkMode ? 1 : 0,
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <Ionicons
                name={isPressingHideButton ? "eye" : "eye-off"}
                color={
                  uiPreferences.isEinkMode ? theme.colors.primary : colors.white
                }
                style={themedStyles.memoryButtonIcon}
              />
              <Text style={themedStyles.memoryButtonText}>
                {isPressingHideButton
                  ? "Release to show text"
                  : "Press to hide text"}
              </Text>
            </Pressable>
          )}
          {renderFooter?.()}
        </Animated.View>
      </Animated.ScrollView>

      {/* Transition overlay — covers content while loading next passage */}
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: theme.colors.background,
          justifyContent: "center",
          alignItems: "center",
          opacity: transitionOverlayOpacity,
        }}
        pointerEvents="none"
      >
        <ActivityIndicator size="large" color={theme.colors.text} />
      </Animated.View>

      {/* Highlight color picker — positioned above the PassageToolbar */}
      {highlightEnabled && highlightRenderer.colorPickerTarget && (
        <HighlightColorPicker
          activeColor={highlightRenderer.colorPickerTarget.color}
          onSelectColor={highlightRenderer.changeColor}
          onDelete={highlightRenderer.deleteHighlight}
          onNote={
            onNote
              ? () => {
                  const target = highlightRenderer.colorPickerTarget;
                  if (target) {
                    highlightRenderer.dismissColorPicker();
                    onNote(target.startVerse, target.endVerse);
                  }
                }
              : undefined
          }
          hasNote={
            noteLookup && highlightRenderer.colorPickerTarget
              ? Array.from(
                  {
                    length:
                      highlightRenderer.colorPickerTarget.endVerse -
                      highlightRenderer.colorPickerTarget.startVerse +
                      1,
                  },
                  (_, i) =>
                    `${highlightRenderer.colorPickerTarget!.bookId}:${
                      highlightRenderer.colorPickerTarget!.chapter
                    }:${highlightRenderer.colorPickerTarget!.startVerse + i}`
                ).some((key) => noteLookup[key])
              : false
          }
          onDismiss={highlightRenderer.dismissColorPicker}
        />
      )}
    </View>
  );
};
/* eslint-enable react/prop-types */
