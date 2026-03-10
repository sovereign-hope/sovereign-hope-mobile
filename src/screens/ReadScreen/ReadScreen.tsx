/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useLayoutEffect } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTheme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";
import { usePassageLoader } from "src/hooks/usePassageLoader";
import { Ionicons } from "@expo/vector-icons";
import { playPassageAudio } from "src/services/passageAudio";
import {
  selectAudioUrl,
  selectIsLoading,
  selectPassageHeader,
} from "src/redux/esvSlice";
import { CommonActions } from "@react-navigation/native";
import { ReadScrollView } from "src/components/ReadScrollView/ReadScrollView";
import { fetchBibleChapter } from "src/redux/bibleSlice";
import { passageToLocation } from "src/app/bibleUtils";
import { styles } from "./ReadScreen.styles";
import { spacing } from "src/style/layout";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { getPressFeedbackStyle } from "src/style/eink";

const isIOS26OrNewer = (): boolean =>
  Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26;

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

  // Custom hooks
  const dispatch = useAppDispatch();
  const miniPlayerHeight = useMiniPlayerHeight();
  const insets = useSafeAreaInsets();
  const audioUrl = useAppSelector(selectAudioUrl);
  const audioTitle = useAppSelector(selectPassageHeader);
  const isLoading = useAppSelector(selectIsLoading);
  const theme = useTheme();
  const uiPreferences = useUiPreferences();
  const actionColor = uiPreferences.isEinkMode
    ? theme.colors.primary
    : colors.accent;

  const onDone = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const {
    passageIndex,
    shouldShowMemoryButton,
    heading,
    isNavigatingPassages,
    hasLoadedCurrentPassage,
    handleNextPassage,
    handlePreviousPassage,
  } = usePassageLoader(passages, onComplete, onDone);

  // Navbar handlers
  const playAudio = useCallback(async () => {
    if (!audioUrl) {
      return;
    }
    try {
      await playPassageAudio(audioUrl, audioTitle ?? "");
    } catch {
      // Audio playback failure is non-critical
    }
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

  const handleOpenInBible = useCallback(() => {
    const currentPassage = passages[passageIndex];
    const location = passageToLocation(currentPassage);
    if (!location) {
      return;
    }

    void dispatch(fetchBibleChapter(location));
    navigation.dispatch(CommonActions.navigate("Home", { screen: "Bible" }));
  }, [dispatch, navigation, passageIndex, passages]);

  useEffect(() => {
    if (isIOS26OrNewer()) {
      navigation.setOptions({
        headerRight: undefined,
        unstable_headerRightItems: ({ tintColor }) => {
          const items = [
            {
              type: "button" as const,
              label: "Open in Bible",
              icon: {
                type: "sfSymbol" as const,
                name: "book" as never,
              },
              onPress: handleOpenInBible,
              tintColor: tintColor ?? actionColor,
              sharesBackground: false,
            },
            {
              type: "button" as const,
              label: "Font Size",
              icon: {
                type: "sfSymbol" as const,
                name: "textformat.size" as never,
              },
              onPress: showSelectFontSize,
              tintColor: tintColor ?? actionColor,
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
              tintColor: tintColor ?? actionColor,
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
            style={({ pressed }) => ({
              marginRight: spacing.large,
              ...getPressFeedbackStyle(pressed, uiPreferences.isEinkMode),
            })}
            accessibilityRole="button"
            accessibilityLabel="Open in Bible"
            accessibilityHint="Opens this chapter in the Bible tab"
            onPress={handleOpenInBible}
          >
            <Ionicons name="book-outline" size={24} color={actionColor} />
          </Pressable>
          <Pressable
            style={({ pressed }) => ({
              marginRight: spacing.large,
              ...getPressFeedbackStyle(pressed, uiPreferences.isEinkMode),
            })}
            accessibilityRole="button"
            onPress={showSelectFontSize}
          >
            <Ionicons name="text-outline" size={24} color={actionColor} />
          </Pressable>
          {audioUrl && audioUrl !== "" && (
            <Pressable
              style={({ pressed }) => ({
                marginRight: spacing.large,
                ...getPressFeedbackStyle(pressed, uiPreferences.isEinkMode),
              })}
              accessibilityRole="button"
              onPress={() => void playAudio()}
            >
              <Ionicons
                name="volume-high-outline"
                size={24}
                color={actionColor}
              />
            </Pressable>
          )}
        </>
      ),
    });
  }, [
    actionColor,
    audioUrl,
    handleOpenInBible,
    navigation,
    playAudio,
    showSelectFontSize,
    uiPreferences.isEinkMode,
  ]);

  // Constants
  const themedStyles = styles({ theme });

  return (
    <SafeAreaView style={themedStyles.screen} edges={["left", "right"]}>
      {isLoading && !hasLoadedCurrentPassage ? (
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
