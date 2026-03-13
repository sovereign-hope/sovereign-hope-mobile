import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  useTheme,
  useNavigation,
  NavigationProp,
  useRoute,
  RouteProp,
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
  extractAudioUrl,
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
import { DEFAULT_BIBLE_LOCATION } from "src/types/bible";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { getPressFeedbackStyle } from "src/style/eink";
import { playPassageAudio } from "src/services/passageAudio";
import { colors } from "src/style/colors";
import { useTabBarHeightContext } from "src/navigation/TabBarContext";
import { styles } from "./BibleScreen.styles";

export const BibleScreen: React.FunctionComponent = () => {
  const dispatch = useAppDispatch();
  const route = useRoute<RouteProp<RootStackParamList, "Bible">>();
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

  const themedStyles = useMemo(
    () => styles({ theme, isEinkMode: uiPreferences.isEinkMode }),
    [theme, uiPreferences.isEinkMode]
  );

  // Restore last-read location then fetch the chapter.
  // Skip restore when route params already specify a location (e.g. from HighlightsScreen).
  useEffect(() => {
    if (route.params?.bookId && route.params?.chapter) {
      void dispatch(
        fetchBibleChapter({
          bookId: route.params.bookId,
          chapter: route.params.chapter,
        })
      );
      return;
    }

    const init = async () => {
      try {
        const result = await dispatch(restoreLastReadLocation()).unwrap();
        void dispatch(fetchBibleChapter(result));
      } catch {
        void dispatch(fetchBibleChapter(DEFAULT_BIBLE_LOCATION));
      }
    };

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run when route params change (highlight navigation)
  }, [dispatch, route.params?.bookId, route.params?.chapter]);

  const handlePickerSelect = useCallback(
    (newLocation: BibleLocation) => {
      void dispatch(fetchBibleChapter(newLocation));
    },
    [dispatch]
  );

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleOpenPicker = useCallback(() => {
    if (Platform.OS === "ios") void Haptics.selectionAsync();
    pickerRef.current?.present();
  }, []);

  const handleOpenReadingPlan = useCallback(() => {
    if (Platform.OS === "ios") void Haptics.selectionAsync();
    navigation.navigate("Reading Plan");
  }, [navigation]);

  const handleFontSize = useCallback(() => {
    if (Platform.OS === "ios") void Haptics.selectionAsync();
    navigation.navigate("Font Size");
  }, [navigation]);

  const audioUrl = useMemo(
    () => extractAudioUrl(chapter?.passages[0]),
    [chapter]
  );

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
      if (Platform.OS === "ios")
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void dispatch(fetchBibleChapter(prevChapter));
    }
  }, [dispatch, prevChapter]);

  const handleNextChapter = useCallback(() => {
    if (nextChapter) {
      if (Platform.OS === "ios")
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    actions.push({
      key: "highlights",
      icon: "star-outline",
      label: "Highlights",
      accessibilityLabel: "View Highlights",
      accessibilityHint: "View all your saved highlights",
      onPress: () => navigation.navigate("Highlights"),
    });
    if (prevChapter) {
      actions.push({
        key: "prev",
        icon: "chevron-back-outline",
        label: "Prev.",
        accessibilityLabel: "Previous Chapter",
        accessibilityHint: "Go to the previous chapter",
        onPress: handlePreviousChapter,
      });
    }
    if (nextChapter) {
      actions.push({
        key: "next",
        icon: "chevron-forward-outline",
        label: "Next",
        accessibilityLabel: "Next Chapter",
        accessibilityHint: "Go to the next chapter",
        onPress: handleNextChapter,
      });
    }
    return actions;
  }, [
    audioUrl,
    handleFontSize,
    handleNextChapter,
    handlePlayAudio,
    handlePreviousChapter,
    navigation,
    nextChapter,
    prevChapter,
  ]);

  // Determine content based on state
  let content: React.JSX.Element;

  if (hasError && !chapter) {
    // Error state
    content = (
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
      </View>
    );
  } else if (isLoading && !chapter) {
    // Loading state (initial load only)
    content = (
      <View style={themedStyles.centered}>
        <ActivityIndicator
          size="large"
          color={uiPreferences.isEinkMode ? colors.black : colors.accent}
        />
      </View>
    );
  } else {
    content = (
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
          bookId={location.bookId}
          chapter={location.chapter}
        />
        <PassageToolbar
          actions={toolbarActions}
          visible={toolbarVisible}
          bottomInset={tabBarHeight}
        />
      </>
    );
  }

  return (
    <>
      {content}
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
