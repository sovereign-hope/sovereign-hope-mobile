/* eslint-disable react/prop-types */
import React, { useCallback } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
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
import { useUiPreferences } from "src/hooks/useUiPreferences";

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

  // Constants
  const themedStyles = styles({ theme, isEinkMode: uiPreferences.isEinkMode });

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
            bottomInset={insets.bottom + 56}
          />
          <View
            style={[themedStyles.toolbar, { paddingBottom: insets.bottom }]}
          >
            <Pressable
              style={({ pressed }) => [
                themedStyles.toolbarButton,
                pressed && themedStyles.toolbarButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open in Bible"
              accessibilityHint="Opens this chapter in the Bible tab"
              onPress={handleOpenInBible}
            >
              <Ionicons name="book-outline" size={24} color={actionColor} />
              <Text style={themedStyles.toolbarLabel}>Bible</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                themedStyles.toolbarButton,
                pressed && themedStyles.toolbarButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Font Size"
              accessibilityHint="Adjust reading font size"
              onPress={showSelectFontSize}
            >
              <Ionicons name="text-outline" size={24} color={actionColor} />
              <Text style={themedStyles.toolbarLabel}>Font</Text>
            </Pressable>
            {audioUrl && audioUrl !== "" && (
              <Pressable
                style={({ pressed }) => [
                  themedStyles.toolbarButton,
                  pressed && themedStyles.toolbarButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Play Audio"
                accessibilityHint="Listen to this passage"
                onPress={() => void playAudio()}
              >
                <Ionicons
                  name="volume-high-outline"
                  size={24}
                  color={actionColor}
                />
                <Text style={themedStyles.toolbarLabel}>Listen</Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

/* eslint-enable react/prop-types */
