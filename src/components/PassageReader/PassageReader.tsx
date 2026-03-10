/* eslint-disable react/prop-types */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  Animated,
  View,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { selectCurrentPassageCommentaryHTML } from "src/redux/commentarySlice";
import cheerio from "cheerio";
import Collapsible from "react-native-collapsible";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { getPressFeedbackStyle } from "src/style/eink";

const PASSAGE_FADE_DURATION_MS = 220;
const PASSAGE_SCROLL_RESET_FALLBACK_MS = 700;

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
  /** Optional ESV response data — when provided, overrides the esvSlice selector */
  passageData?: EsvResponse;
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
  renderFooter,
  onClose,
  passageData,
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
  const uiPreferences = useUiPreferences();

  // Ref Hooks
  const scrollViewRef = useRef<ScrollView>(null);
  const animation = useRef(new Animated.Value(1)).current;
  const passageTransitionOpacity = useRef(new Animated.Value(1)).current;
  const mountAnimation = useRef(new Animated.Value(0)).current;
  const pendingRevealRef = useRef(false);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevContentKeyRef = useRef<number | string>(contentKey);
  const transitionStartKeyRef = useRef<number | string | null>(null);

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
  }, [passageTransitionOpacity, runTiming]);

  const fadeOutPassage = React.useCallback(() => {
    runTiming(passageTransitionOpacity, 0, PASSAGE_FADE_DURATION_MS);
  }, [passageTransitionOpacity, runTiming]);

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
      if (isTransitioning || !pendingRevealRef.current) {
        return;
      }

      if (event.nativeEvent.contentOffset.y <= 1) {
        revealPassageAfterScrollReset();
      }
    },
    [isTransitioning, revealPassageAfterScrollReset]
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

  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      style={[themedStyles.container, { opacity: mountAnimation }]}
      contentInsetAdjustmentBehavior={adjustsForInsets ? "automatic" : "never"}
      automaticallyAdjustContentInsets={adjustsForInsets}
      automaticallyAdjustsScrollIndicatorInsets={adjustsForInsets}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom:
          (adjustsForInsets ? insets.top : 0) +
          miniPlayerHeight +
          bottomInset +
          spacing.large,
      }}
      scrollIndicatorInsets={{
        bottom:
          (adjustsForInsets ? insets.top : 0) + miniPlayerHeight + bottomInset,
      }}
      onScroll={handleScroll}
      scrollEventThrottle={16}
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
      <Animated.View style={{ opacity: passageTransitionOpacity }}>
        {heading.length > 0 && (
          <Text style={themedStyles.title}>{heading}</Text>
        )}
        <Animated.View style={{ opacity: animation }}>
          <RenderHtml
            contentWidth={width}
            source={{ html: passageText?.passages[0] ?? "" }}
            tagsStyles={tagsStyles}
            customHTMLElementModels={customHTMLElementModels}
          />
          {!showMemoryButton && commentaryHTML != "" && (
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
                    name={isShowingCommentary ? "chevron-up" : "chevron-down"}
                    size={24}
                    color={theme.colors.border}
                  />
                </View>
                <Collapsible
                  collapsed={!isShowingCommentary}
                  duration={uiPreferences.disableAnimations ? 0 : 300}
                >
                  <RenderHtml
                    contentWidth={width}
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
        {!showMemoryButton && (
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
                What does this passage teach us about our own hearts and lives,
                and the world we live in?
              </Text>
              <Text style={themedStyles.studyQuestionSubHeader}>Look Out</Text>
              <Text style={themedStyles.studyQuestion}>
                How does this passage influence the way we should act and think
                as Christians at home, at work, in relationships or as the
                church?
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
        <View style={themedStyles.spacer} />
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
  );
};
/* eslint-enable react/prop-types */
