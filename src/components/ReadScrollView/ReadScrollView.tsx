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
import RenderHtml, {
  HTMLElementModel,
  HTMLContentModel,
  MixedStyleDeclaration,
} from "react-native-render-html";
import { FlatButton } from "src/components/FlatButton/FlatButton";
import { styles } from "./ReadScrollView.styles";
import { spacing } from "src/style/layout";
import { selectReadingFontSize } from "src/redux/settingsSlice";
import { selectCurrentPassageCommentaryHTML } from "src/redux/commentarySlice";
import cheerio from "cheerio";
import Collapsible from "react-native-collapsible";

const PASSAGE_FADE_DURATION_MS = 220;
const PASSAGE_SCROLL_RESET_FALLBACK_MS = 700;

export interface ReadScrollViewProps {
  showMemoryButton: boolean;
  heading: string;
  passageIndex: number;
  showPreviousPassageButton: boolean;
  canGoToPreviousPassage: boolean;
  isNavigatingPassages: boolean;
  onPreviousPassage: () => void;
  onNextPassage: () => void;
  hasNextPassage: boolean;
  miniPlayerHeight: number;
  bottomInset: number;
  contentWidth?: number;
  adjustsForInsets?: boolean;
  onClose?: () => void;
}

export const ReadScrollView: React.FunctionComponent<ReadScrollViewProps> = ({
  showMemoryButton,
  heading,
  passageIndex,
  showPreviousPassageButton,
  canGoToPreviousPassage,
  isNavigatingPassages,
  onPreviousPassage,
  onNextPassage,
  hasNextPassage,
  miniPlayerHeight,
  bottomInset,
  contentWidth: contentWidthProp,
  adjustsForInsets = false,
  onClose,
}: ReadScrollViewProps) => {
  // State
  const [isPressingHideButton, setIsPressingHideButton] = useState(false);
  const [commentaryHTMLTags, setCommentaryHTMLTags] = useState("");
  const [isShowingCommentary, setIsShowingCommentary] = useState(false);

  // Custom hooks
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const passageText = useAppSelector(selectCurrentPassage);
  const commentaryHTML = useAppSelector(selectCurrentPassageCommentaryHTML);
  const fontSize = useAppSelector(selectReadingFontSize);
  const { width: windowWidth } = useWindowDimensions();
  const width = contentWidthProp ?? windowWidth;

  // Ref Hooks
  const scrollViewRef = useRef<ScrollView>(null);
  const animation = useRef(new Animated.Value(1)).current;
  const passageTransitionOpacity = useRef(new Animated.Value(1)).current;
  const mountAnimation = useRef(new Animated.Value(0)).current;
  const pendingRevealRef = useRef(false);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationStartPassageIndexRef = useRef<number | null>(null);

  // Effect hooks
  useEffect(() => {
    Animated.timing(mountAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [mountAnimation]);

  const fadeInPassage = React.useCallback(() => {
    Animated.timing(passageTransitionOpacity, {
      toValue: 1,
      duration: PASSAGE_FADE_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [passageTransitionOpacity]);

  const fadeOutPassage = React.useCallback(() => {
    Animated.timing(passageTransitionOpacity, {
      toValue: 0,
      duration: PASSAGE_FADE_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [passageTransitionOpacity]);

  const revealPassageAfterScrollReset = React.useCallback(() => {
    if (isNavigatingPassages || !pendingRevealRef.current) {
      return;
    }

    pendingRevealRef.current = false;
    // eslint-disable-next-line unicorn/no-null
    navigationStartPassageIndexRef.current = null;
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
    }
    fadeInPassage();
  }, [fadeInPassage, isNavigatingPassages]);

  useEffect(
    () => () => {
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (isNavigatingPassages) {
      navigationStartPassageIndexRef.current = passageIndex;
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
      pendingRevealRef.current = false;
      fadeOutPassage();
      return;
    }

    const didPassageChangeDuringNavigation =
      navigationStartPassageIndexRef.current !== null &&
      navigationStartPassageIndexRef.current !== passageIndex;

    if (!didPassageChangeDuringNavigation && !pendingRevealRef.current) {
      // eslint-disable-next-line unicorn/no-null
      navigationStartPassageIndexRef.current = null;
      fadeInPassage();
    }
  }, [fadeInPassage, fadeOutPassage, isNavigatingPassages, passageIndex]);

  const prevPassageIndexRef = useRef(passageIndex);
  useEffect(() => {
    if (prevPassageIndexRef.current !== passageIndex) {
      prevPassageIndexRef.current = passageIndex;
      pendingRevealRef.current = true;
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
      revealTimeoutRef.current = setTimeout(() => {
        revealPassageAfterScrollReset();
      }, PASSAGE_SCROLL_RESET_FALLBACK_MS);
    }
  }, [adjustsForInsets, passageIndex, revealPassageAfterScrollReset]);

  const handleScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isNavigatingPassages || !pendingRevealRef.current) {
        return;
      }

      if (event.nativeEvent.contentOffset.y <= 1) {
        revealPassageAfterScrollReset();
      }
    },
    [isNavigatingPassages, revealPassageAfterScrollReset]
  );

  useEffect(() => {
    if (commentaryHTML) {
      const $ = cheerio.load(commentaryHTML);
      setCommentaryHTMLTags($(".commentary-container").html() ?? "");
    }
  }, [commentaryHTML]);

  // Constants
  const themedStyles = styles({ theme });

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
        color: colors.accent,
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
        color: colors.accent,
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
    [fontSize, theme.colors.text]
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
        color: colors.red,
        marginVertical: spacing.small,
      },
    }),
    []
  );

  const isPreviousPassageDisabled =
    !canGoToPreviousPassage || isNavigatingPassages;

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
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
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
                {
                  opacity: pressed ? 0.7 : 1,
                },
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
                <Collapsible collapsed={!isShowingCommentary}>
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
              Animated.timing(animation, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }).start();
            }}
            onPressOut={() => {
              setIsPressingHideButton(false);
              Animated.timing(animation, {
                toValue: 1,
                duration: 500,
                useNativeDriver: false,
              }).start();
            }}
            style={[
              themedStyles.memoryButton,
              {
                backgroundColor: isPressingHideButton
                  ? colors.green
                  : colors.red,
              },
            ]}
          >
            <Ionicons
              name={isPressingHideButton ? "eye" : "eye-off"}
              color={colors.white}
              style={themedStyles.memoryButtonIcon}
            />
            <Text style={themedStyles.memoryButtonText}>
              {isPressingHideButton
                ? "Release to show text"
                : "Press to hide text"}
            </Text>
          </Pressable>
        )}
        <View style={themedStyles.buttonRow}>
          {showPreviousPassageButton && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous passage"
              accessibilityHint="Opens the previous passage in this reading"
              accessibilityState={{ disabled: isPreviousPassageDisabled }}
              disabled={isPreviousPassageDisabled}
              onPress={onPreviousPassage}
              style={({ pressed }) => [
                themedStyles.buttonSecondary,
                isPreviousPassageDisabled &&
                  themedStyles.buttonSecondaryDisabled,
                pressed &&
                  !isPreviousPassageDisabled &&
                  themedStyles.buttonSecondaryPressed,
              ]}
            >
              <Text
                style={[
                  themedStyles.buttonSecondaryText,
                  isPreviousPassageDisabled &&
                    themedStyles.buttonSecondaryTextDisabled,
                ]}
              >
                Previous
              </Text>
            </Pressable>
          )}
          <FlatButton
            title={hasNextPassage ? "Next" : "Done"}
            onPress={onNextPassage}
            disabled={isNavigatingPassages}
            style={themedStyles.button}
          />
        </View>
      </Animated.View>
    </Animated.ScrollView>
  );
};
/* eslint-enable react/prop-types */
