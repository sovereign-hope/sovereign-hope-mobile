/* eslint-disable react/prop-types */
// Disabling this because of weird behavior with the react/prop-types rule in this file. It isn't recognizing navigation
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  Animated,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { useAppSelector } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTheme } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { colors } from "src/style/colors";
import { header1, header3 } from "src/style/typography";
import { Ionicons } from "@expo/vector-icons";
import TrackPlayer, { Track } from "react-native-track-player";
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
  onNextPassage: () => void;
  isFinalPassage: boolean;
}

const ReadScrollView: React.FunctionComponent<ReadScrollViewProps> = ({
  showMemoryButton,
  heading,
  onNextPassage,
  isFinalPassage,
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
  }, []);

  useEffect(() => {
    if (!isFinalPassage) {
      scrollViewRef.current?.scrollTo({ y: 0 });
    }
  }, [heading, isFinalPassage]);

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
    h2: {
      fontSize: header1.fontSize,
      height: 50,
    },
    h3: {
      fontSize: header3.fontSize,
      // marginTop: spacing.small,
    },
    a: {
      color: colors.accent,
      textDecorationLine: "none",
    },
  };

  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      style={[themedStyles.container, { opacity: mountAnimation }]}
      contentContainerStyle={{ flexGrow: 1 }}
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
      <FlatButton
        title={isFinalPassage ? "Next" : "Done"}
        onPress={onNextPassage}
        style={themedStyles.button}
      />
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

  // Custom hooks
  const dispatch = useDispatch();

  // Custom hooks
  const audioUrl = useAppSelector(selectAudioUrl);
  const audioTitle = useAppSelector(selectPassageHeader);
  const isLoading = useAppSelector(selectIsLoading);
  const theme = useTheme();

  // Navbar handlers
  const playAudio = async () => {
    await TrackPlayer.reset();
    const track: Track = {
      url: audioUrl ?? "",
      title: audioTitle ?? "",
      artist: "ESV Bible",
    };
    await TrackPlayer.add(track);
    await TrackPlayer.play();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Effect hooks
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: undefined,
    });
  }, [navigation]);

  useEffect(() => {
    const passage = passages[passageIndex];
    setShouldShowMemoryButton(passage.isMemory);
    setHeading(passage.heading ?? "");
    dispatch(getPassageText({ passage, includeFootnotes: true }));
    dispatch(getPassageCommentary({ passage }));
    dispatch(getReadingFontSize());
  }, [dispatch]);

  const showSelectFontSize = () => {
    navigation.push("Font Size");
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: ({ tintColor }: { tintColor?: string | undefined }) => (
        <>
          <Pressable
            style={{
              marginRight: spacing.large,
            }}
            accessibilityRole="button"
            onPress={() => showSelectFontSize()}
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
  }, [navigation, audioUrl]);

  // Constants
  const themedStyles = styles({ theme });

  // Event handlers
  const handleNextPassage = () => {
    if (passageIndex < passages.length - 1) {
      const passage = passages[passageIndex + 1];
      setShouldShowMemoryButton(passage.isMemory);
      setHeading(passage.heading ?? "");
      dispatch(
        getPassageText({
          passage,
          includeFootnotes: !passage.isMemory,
        })
      );
      dispatch(getPassageCommentary({ passage }));
      setPassageIndex(passageIndex + 1);

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView
      style={themedStyles.screen}
      edges={["left", "bottom", "right"]}
    >
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.text} />
      ) : (
        <>
          <ReadScrollView
            showMemoryButton={shouldShowMemoryButton}
            heading={heading}
            onNextPassage={handleNextPassage}
            isFinalPassage={passageIndex < passages.length - 1}
          />
        </>
      )}
    </SafeAreaView>
  );
};

/* eslint-enable react/prop-types */
