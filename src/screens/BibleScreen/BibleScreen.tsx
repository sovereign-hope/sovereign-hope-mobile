import React, { useEffect, useCallback, useLayoutEffect, useRef } from "react";
import { Pressable, Text, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { BiblePicker } from "src/components/BiblePicker/BiblePicker";
import type { BiblePickerHandle } from "src/components/BiblePicker/BiblePicker";
import type { BibleLocation } from "src/types/bible";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { getPressFeedbackStyle } from "src/style/eink";
import { colors } from "src/style/colors";
import { styles } from "./BibleScreen.styles";

export const BibleScreen: React.FunctionComponent = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const miniPlayerHeight = useMiniPlayerHeight();
  const uiPreferences = useUiPreferences();
  const pickerRef = useRef<BiblePickerHandle>(null);

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
          <Ionicons name="calendar-outline" size={24} color={actionColor} />
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
        bottomInset={insets.bottom}
        renderFooter={renderFooter}
        passageData={chapter}
      />
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
