import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View, ActivityIndicator } from "react-native";
import {
  useTheme,
  useNavigation,
  NavigationProp,
} from "@react-navigation/native";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import {
  fetchBibleChapter,
  restoreLastReadLocation,
  selectBibleChapter,
  selectBibleHasError,
  selectBibleIsLoading,
  selectBibleLocation,
} from "src/redux/bibleSlice";
import {
  formatBibleLocation,
  getNextChapter,
  getPreviousChapter,
} from "src/app/bibleUtils";
import { PassageReader } from "src/components/PassageReader/PassageReader";
import { PassageToolbar } from "src/components/PassageToolbar/PassageToolbar";
import type { PassageToolbarAction } from "src/components/PassageToolbar/PassageToolbar";
import { BiblePicker } from "src/components/BiblePicker/BiblePicker";
import type { BiblePickerHandle } from "src/components/BiblePicker/BiblePicker";
import type { BibleLocation } from "src/types/bible";
import { useTabBarHeightContext } from "src/navigation/TabBarContext";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { getPressFeedbackStyle } from "src/style/eink";
import { playPassageAudio } from "src/services/passageAudio";
import { colors } from "src/style/colors";
import { styles } from "./BibleScreen.styles";

export const BibleScreen: React.FunctionComponent = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const { height: tabBarHeight } = useTabBarHeightContext();
  const miniPlayerHeight = useMiniPlayerHeight();
  const uiPreferences = useUiPreferences();
  const pickerRef = useRef<BiblePickerHandle>(null);
  const [toolbarVisible, setToolbarVisible] = useState(true);

  const handleScrollDirection = useCallback((direction: "up" | "down") => {
    setToolbarVisible(direction === "up");
  }, []);

  const location = useAppSelector(selectBibleLocation);
  const chapter = useAppSelector(selectBibleChapter);
  const isLoading = useAppSelector(selectBibleIsLoading);
  const hasError = useAppSelector(selectBibleHasError);

  const locationLabel = formatBibleLocation(location);
  const prevChapter = getPreviousChapter(location);
  const nextChapter = getNextChapter(location);

  const themedStyles = styles({
    theme,
    isEinkMode: uiPreferences.isEinkMode,
  });

  // Restore last-read location then fetch the chapter
  useEffect(() => {
    const init = async () => {
      const result = await dispatch(restoreLastReadLocation()).unwrap();
      void dispatch(fetchBibleChapter(result));
    };

    void init();
  }, [dispatch]);

  const handlePickerSelect = useCallback(
    (newLocation: BibleLocation) => {
      void dispatch(fetchBibleChapter(newLocation));
    },
    [dispatch]
  );

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleOpenPicker = useCallback(() => {
    pickerRef.current?.present();
  }, []);

  const handleOpenReadingPlan = useCallback(() => {
    navigation.navigate("Reading Plan");
  }, [navigation]);

  const handleFontSize = useCallback(() => {
    navigation.navigate("Font Size");
  }, [navigation]);

  // Extract audio URL from the chapter HTML (same pattern as esvSlice)
  const audioUrl = useMemo(() => {
    const html = chapter?.passages[0];
    if (!html) {
      return;
    }
    const match = html.match(/https:\/\/audio.esv.org\/.*.mp3/);
    return match?.[0];
  }, [chapter]);

  const handlePlayAudio = useCallback(async () => {
    if (!audioUrl) {
      return;
    }
    try {
      await playPassageAudio(audioUrl, locationLabel);
    } catch {
      // Audio playback failure is non-critical
    }
  }, [audioUrl, locationLabel]);

  const actionColor = uiPreferences.isEinkMode
    ? theme.dark
      ? colors.white
      : colors.black
    : colors.accent;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${locationLabel}. Tap to choose a book and chapter.`}
          accessibilityHint="Opens the book and chapter picker"
          onPress={handleOpenPicker}
          style={({ pressed }) => [
            themedStyles.headerTitleButton,
            pressed && { opacity: 0.65 },
          ]}
        >
          <Text style={themedStyles.headerTitleText}>{locationLabel}</Text>
          <Ionicons name="chevron-down" size={16} color={actionColor} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reading Plan"
          accessibilityHint="Opens your reading plan"
          onPress={handleOpenReadingPlan}
          style={({ pressed }) => [pressed && { opacity: 0.65 }]}
        >
          <Ionicons name="calendar-outline" size={22} color={actionColor} />
        </Pressable>
      ),
    });
  }, [
    actionColor,
    handleOpenPicker,
    handleOpenReadingPlan,
    locationLabel,
    navigation,
    themedStyles,
  ]);

  const handlePreviousChapter = useCallback(() => {
    if (prevChapter) {
      void dispatch(fetchBibleChapter(prevChapter));
    }
  }, [dispatch, prevChapter]);

  const handleNextChapter = useCallback(() => {
    if (nextChapter) {
      void dispatch(fetchBibleChapter(nextChapter));
    }
  }, [dispatch, nextChapter]);

  const renderFooter = useCallback(
    () => (
      <View style={themedStyles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous chapter"
          accessibilityHint="Navigate to the previous chapter"
          accessibilityState={{ disabled: !prevChapter || isLoading }}
          disabled={!prevChapter || isLoading}
          onPress={handlePreviousChapter}
          style={({ pressed }) => [
            themedStyles.navButton,
            (!prevChapter || isLoading) && themedStyles.navButtonDisabled,
            pressed &&
              prevChapter &&
              !isLoading &&
              themedStyles.navButtonPressed,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={
              !prevChapter || isLoading
                ? themedStyles.navButtonTextDisabled.color
                : themedStyles.navButtonText.color
            }
          />
          <Text
            style={[
              themedStyles.navButtonText,
              (!prevChapter || isLoading) && themedStyles.navButtonTextDisabled,
            ]}
          >
            Previous Chapter
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next chapter"
          accessibilityHint="Navigate to the next chapter"
          accessibilityState={{ disabled: !nextChapter || isLoading }}
          disabled={!nextChapter || isLoading}
          onPress={handleNextChapter}
          style={({ pressed }) => [
            themedStyles.navButton,
            (!nextChapter || isLoading) && themedStyles.navButtonDisabled,
            pressed &&
              nextChapter &&
              !isLoading &&
              themedStyles.navButtonPressed,
          ]}
        >
          <Text
            style={[
              themedStyles.navButtonText,
              (!nextChapter || isLoading) && themedStyles.navButtonTextDisabled,
            ]}
          >
            Next Chapter
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              !nextChapter || isLoading
                ? themedStyles.navButtonTextDisabled.color
                : themedStyles.navButtonText.color
            }
          />
        </Pressable>
      </View>
    ),
    [
      handleNextChapter,
      handlePreviousChapter,
      isLoading,
      nextChapter,
      prevChapter,
      themedStyles,
    ]
  );

  const toolbarActions = useMemo(() => {
    const actions: PassageToolbarAction[] = [
      {
        key: "font",
        icon: "text-outline",
        label: "Font",
        accessibilityLabel: "Font Size",
        accessibilityHint: "Adjust reading font size",
        onPress: handleFontSize,
      },
    ];
    if (audioUrl) {
      actions.push({
        key: "listen",
        icon: "volume-high-outline",
        label: "Listen",
        accessibilityHint: "Listen to this chapter",
        onPress: () => void handlePlayAudio(),
      });
    }
    return actions;
  }, [audioUrl, handleFontSize, handlePlayAudio]);

  // Error state
  if (hasError && !chapter) {
    return (
      <View style={themedStyles.centered}>
        <Text style={themedStyles.errorText}>
          Unable to load this chapter. Check your connection and try again.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void dispatch(fetchBibleChapter(location))}
          style={({ pressed }) => [
            themedStyles.retryButton,
            pressed &&
              getPressFeedbackStyle(pressed, uiPreferences.isEinkMode, {
                pressedOpacity: 0.65,
                isDarkMode: theme.dark,
              }),
          ]}
        >
          <Text style={themedStyles.retryButtonText}>Retry</Text>
        </Pressable>
        <BiblePicker
          ref={pickerRef}
          currentLocation={location}
          onSelectLocation={handlePickerSelect}
        />
      </View>
    );
  }

  // Loading state (initial load only)
  if (isLoading && !chapter) {
    return (
      <View style={themedStyles.centered}>
        <ActivityIndicator
          size="large"
          color={uiPreferences.isEinkMode ? colors.black : colors.accent}
        />
      </View>
    );
  }

  return (
    <>
      <PassageReader
        heading=""
        showMemoryButton={false}
        contentKey={`${location.bookId}-${location.chapter}`}
        isTransitioning={isLoading}
        miniPlayerHeight={miniPlayerHeight}
        bottomInset={tabBarHeight}
        renderFooter={renderFooter}
        passageData={chapter}
        onScrollDirectionChange={handleScrollDirection}
      />
      <PassageToolbar actions={toolbarActions} visible={toolbarVisible} />
      <BiblePicker
        ref={pickerRef}
        currentLocation={location}
        onSelectLocation={handlePickerSelect}
      />
    </>
  );
};

/** Exposed for the navigation header to open the picker */
export type { BiblePickerHandle } from "src/components/BiblePicker/BiblePicker";
