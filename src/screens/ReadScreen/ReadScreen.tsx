/* eslint-disable react/prop-types */
import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTheme } from "@react-navigation/native";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";
import { usePassageLoader } from "src/hooks/usePassageLoader";
import { playPassageAudio } from "src/services/passageAudio";
import {
  selectAudioUrl,
  selectIsLoading,
  selectPassageHeader,
} from "src/redux/esvSlice";
import { CommonActions } from "@react-navigation/native";
import { ReadScrollView } from "src/components/ReadScrollView/ReadScrollView";
import { PassageToolbar } from "src/components/PassageToolbar/PassageToolbar";
import type { PassageToolbarAction } from "src/components/PassageToolbar/PassageToolbar";
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

  const toolbarActions = useMemo(() => {
    const actions: PassageToolbarAction[] = [
      {
        key: "bible",
        icon: "book-outline",
        label: "Bible",
        accessibilityLabel: "Open in Bible",
        accessibilityHint: "Opens this chapter in the Bible tab",
        onPress: handleOpenInBible,
      },
      {
        key: "font",
        icon: "text-outline",
        label: "Font",
        accessibilityLabel: "Font Size",
        accessibilityHint: "Adjust reading font size",
        onPress: showSelectFontSize,
      },
    ];
    if (audioUrl) {
      actions.push({
        key: "listen",
        icon: "volume-high-outline",
        label: "Listen",
        accessibilityLabel: "Play Audio",
        accessibilityHint: "Listen to this passage",
        onPress: () => void playAudio(),
      });
    }
    return actions;
  }, [audioUrl, handleOpenInBible, playAudio, showSelectFontSize]);

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
          <PassageToolbar actions={toolbarActions} />
        </>
      )}
    </SafeAreaView>
  );
};

/* eslint-enable react/prop-types */
