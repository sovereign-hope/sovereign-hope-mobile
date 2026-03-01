/* eslint-disable react/prop-types */
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Pressable,
  Platform,
  ScrollView,
  Text,
  useWindowDimensions,
  Animated,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAppSelector, useAppDispatch } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTheme } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { colors } from "src/style/colors";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";
import { header1, header3 } from "src/style/typography";
import { Ionicons } from "@expo/vector-icons";
import TrackPlayer, { Track } from "react-native-track-player";
import esvLogo from "../../../assets/esv-logo.png";
import { initializeTrackPlayer } from "src/services/trackPlayerSetup";
import {
  getPassageText,
  selectAudioUrl,
  selectCurrentPassage,
  selectIsLoading,
  selectPassageHeader,
} from "src/redux/esvSlice";
import RenderHtml, {
  HTMLElementModel,
  HTMLContentModel,
  MixedStyleDeclaration,
} from "react-native-render-html";
import { FlatButton } from "src/components";
import { styles } from "./ReadScreen.styles";
import { spacing } from "src/style/layout";
import {
  getReadingFontSize,
  selectReadingFontSize,
} from "src/redux/settingsSlice";
import {
  getPassageCommentary,
  selectCurrentPassageCommentaryHTML,
} from "src/redux/commentarySlice";
import cheerio from "cheerio";
import Collapsible from "react-native-collapsible";

interface ReadScrollViewProps {
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
}

const isIOS26OrNewer = (): boolean =>
  Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26;

const ReadScrollView: React.FunctionComponent<ReadScrollViewProps> = ({
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
}: ReadScrollViewProps) => {
  // State
  const [isPressingHideButton, setIsPressingHideButton] = useState(false);
  const [commentaryHTMLTags, setCommentaryHTMLTags] = useState("");
  const [isShowingCommentary, setIsShowingCommentary] = useState(false);

  // Custom hooks
  const theme = useTheme();
  const passageText = useAppSelector(selectCurrentPassage);
  const commentaryHTML = useAppSelector(selectCurrentPassageCommentaryHTML);
  const fontSize = useAppSelector(selectReadingFontSize);
  const { width } = useWindowDimensions();

  // Ref Hooks
  const scrollViewRef = useRef<ScrollView>(null);
  const animation = useRef(new Animated.Value(1)).current;
  const mountAnimation = useRef(new Animated.Value(0)).current;

  // Effect hooks
  useEffect(() => {
    Animated.timing(mountAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [mountAnimation]);

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0 });
  }, [passageIndex]);

  useEffect(() => {
    if (commentaryHTML) {
      const $ = cheerio.load(commentaryHTML);
      setCommentaryHTMLTags($(".commentary-container").html() ?? "");
    }
  }, [commentaryHTML]);

  // Constants
  const themedStyles = styles({ theme });

  const tagsStyles: Record<string, MixedStyleDeclaration> = {
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
  };

  const isPreviousPassageDisabled =
    !canGoToPreviousPassage || isNavigatingPassages;

  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      style={[themedStyles.container, { opacity: mountAnimation }]}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      automaticallyAdjustsScrollIndicatorInsets={false}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: miniPlayerHeight + bottomInset + spacing.large,
      }}
      scrollIndicatorInsets={{
        bottom: miniPlayerHeight + bottomInset,
      }}
    >
      {heading.length > 0 && <Text style={themedStyles.title}>{heading}</Text>}
      <Animated.View style={{ opacity: animation }}>
        <RenderHtml
          contentWidth={width}
          source={{ html: passageText?.passages[0] ?? "" }}
          tagsStyles={tagsStyles}
          customHTMLElementModels={{
            note: HTMLElementModel.fromCustomModel({
              tagName: "note",
              contentModel: HTMLContentModel.block,
            }),
          }}
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
                  classesStyles={{
                    comm: {
                      marginBottom: spacing.medium,
                    },
                    versenum: {
                      fontWeight: "bold",
                    },
                    verse: {
                      fontStyle: "italic",
                      color: colors.red,
                      marginVertical: spacing.small,
                    },
                  }}
                  customHTMLElementModels={{
                    note: HTMLElementModel.fromCustomModel({
                      tagName: "note",
                      contentModel: HTMLContentModel.block,
                    }),
                  }}
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
              How does this passage influence the way we should act and think as
              Christians at home, at work, in relationships or as the church?
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
              prayer life and be sure to set aside time to pray for that today.
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
              backgroundColor: isPressingHideButton ? colors.green : colors.red,
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
              isPreviousPassageDisabled && themedStyles.buttonSecondaryDisabled,
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
    </Animated.ScrollView>
  );
};

export type ReadScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Read"
>;

export const ReadScreen: React.FunctionComponent<ReadScreenProps> = ({
  route,
  navigation,
}: ReadScreenProps) => {
  // Props
  const { passages, onComplete } = route.params;

  // State
  const [passageIndex, setPassageIndex] = useState(0);
  const [shouldShowMemoryButton, setShouldShowMemoryButton] = useState(false);
  const [heading, setHeading] = useState("");
  const [isNavigatingPassages, setIsNavigatingPassages] = useState(false);
  const [hasLoadedCurrentPassage, setHasLoadedCurrentPassage] = useState(false);

  // Custom hooks
  const dispatch = useAppDispatch();
  const miniPlayerHeight = useMiniPlayerHeight();
  const insets = useSafeAreaInsets();

  // Custom hooks
  const audioUrl = useAppSelector(selectAudioUrl);
  const audioTitle = useAppSelector(selectPassageHeader);
  const isLoading = useAppSelector(selectIsLoading);
  const theme = useTheme();
  const isNavigatingPassagesRef = useRef(false);

  // Navbar handlers
  const playAudio = useCallback(async () => {
    const esvLogoSource = esvLogo as ImageSourcePropType;
    const isTrackPlayerInitialized = await initializeTrackPlayer();
    if (!isTrackPlayerInitialized) {
      return;
    }

    await TrackPlayer.reset();
    const track: Track = {
      url: audioUrl ?? "",
      title: audioTitle ?? "",
      artist: "ESV Bible",
      artwork: Image.resolveAssetSource(esvLogoSource).uri,
    };
    await TrackPlayer.add(track);
    await TrackPlayer.play();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [audioTitle, audioUrl]);

  // Effect hooks
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: undefined,
    });
  }, [navigation]);

  const showSelectFontSize = useCallback(() => {
    navigation.push("Font Size");
  }, [navigation]);

  useEffect(() => {
    if (isIOS26OrNewer()) {
      navigation.setOptions({
        headerRight: undefined,
        unstable_headerRightItems: ({ tintColor }) => {
          const items = [
            {
              type: "button" as const,
              label: "Font Size",
              icon: {
                type: "sfSymbol" as const,
                name: "textformat.size" as never,
              },
              onPress: showSelectFontSize,
              tintColor: tintColor ?? colors.accent,
              sharesBackground: false,
            },
          ];

          if (audioUrl && audioUrl !== "") {
            items.push({
              type: "button" as const,
              label: "Play Audio",
              icon: {
                type: "sfSymbol" as const,
                name: "speaker.wave.2" as never,
              },
              onPress: () => {
                void playAudio();
              },
              tintColor: tintColor ?? colors.accent,
              sharesBackground: false,
            });
          }

          return items;
        },
      });
      return;
    }

    navigation.setOptions({
      unstable_headerRightItems: undefined,
      headerRight: () => (
        <>
          <Pressable
            style={{
              marginRight: spacing.large,
            }}
            accessibilityRole="button"
            onPress={showSelectFontSize}
          >
            <Ionicons name="text-outline" size={24} color={colors.accent} />
          </Pressable>
          {audioUrl && audioUrl !== "" && (
            <Pressable
              style={{
                marginRight: spacing.large,
              }}
              accessibilityRole="button"
              onPress={() => void playAudio()}
            >
              <Ionicons
                name="volume-high-outline"
                size={24}
                color={colors.accent}
              />
            </Pressable>
          )}
        </>
      ),
    });
  }, [navigation, audioUrl, playAudio, showSelectFontSize]);

  // Constants
  const themedStyles = styles({ theme });

  const loadPassageAtIndex = useCallback(
    async (nextPassageIndex: number): Promise<boolean> => {
      const passage = passages[nextPassageIndex];
      if (!passage || isNavigatingPassagesRef.current) {
        return false;
      }

      isNavigatingPassagesRef.current = true;
      setIsNavigatingPassages(true);

      try {
        const [passageAction] = await Promise.all([
          dispatch(
            getPassageText({
              passage,
              includeFootnotes: !passage.isMemory,
            })
          ),
          dispatch(getPassageCommentary({ passage })),
        ]);
        const didLoadPassage = getPassageText.fulfilled.match(passageAction);
        if (!didLoadPassage) {
          return false;
        }

        setShouldShowMemoryButton(passage.isMemory);
        setHeading(passage.heading ?? "");
        setPassageIndex(nextPassageIndex);
        setHasLoadedCurrentPassage(true);
        return true;
      } finally {
        isNavigatingPassagesRef.current = false;
        setIsNavigatingPassages(false);
      }
    },
    [dispatch, passages]
  );

  useEffect(() => {
    void loadPassageAtIndex(0);
    void dispatch(getReadingFontSize());
  }, [dispatch, loadPassageAtIndex]);

  // Event handlers
  const handleNextPassage = () => {
    if (isNavigatingPassagesRef.current) {
      return;
    }

    if (passageIndex < passages.length - 1) {
      void (async () => {
        if (await loadPassageAtIndex(passageIndex + 1)) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          return;
        }

        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      })();
    } else {
      if (!hasLoadedCurrentPassage) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
      navigation.goBack();
    }
  };

  const handlePreviousPassage = () => {
    if (isNavigatingPassagesRef.current || passageIndex <= 0) {
      return;
    }

    void (async () => {
      if (await loadPassageAtIndex(passageIndex - 1)) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    })();
  };

  return (
    <SafeAreaView style={themedStyles.screen} edges={["left", "right"]}>
      {isLoading ? (
        <View style={themedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text} />
        </View>
      ) : (
        <>
          <ReadScrollView
            showMemoryButton={shouldShowMemoryButton}
            heading={heading}
            passageIndex={passageIndex}
            showPreviousPassageButton={passages.length > 1}
            canGoToPreviousPassage={passageIndex > 0}
            isNavigatingPassages={isNavigatingPassages}
            onPreviousPassage={handlePreviousPassage}
            onNextPassage={handleNextPassage}
            hasNextPassage={passageIndex < passages.length - 1}
            miniPlayerHeight={miniPlayerHeight}
            bottomInset={insets.bottom}
          />
        </>
      )}
    </SafeAreaView>
  );
};

/* eslint-enable react/prop-types */
