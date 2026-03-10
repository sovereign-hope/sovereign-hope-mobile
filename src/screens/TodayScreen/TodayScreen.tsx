import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  FlatList,
  Image,
  InteractionManager,
  LayoutChangeEvent,
  Linking,
  ListRenderItem,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAppSelector, useAppDispatch } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTabBarHeightContext } from "src/navigation/TabBarContext";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";
import { useTabletLayout } from "src/hooks/useTabletLayout";
import { usePassageLoader } from "src/hooks/usePassageLoader";
import { MemoryAudioCard, WeekGrid, ReadScrollView } from "src/components";
import {
  getReadingPlan,
  storeReadingPlanProgressState,
  getReadingPlanProgressState,
  ReadingPlanProgressState,
  selectDailyReadingPlan,
  selectReadingPlanProgressState,
  ReadingPlanDay,
  selectIsLoading,
  selectAvailablePlans,
  getAvailablePlans,
  selectWeekReadingPlan,
} from "src/redux/readingPlanSlice";
import { selectIsLoading as selectIsMemoryLoading } from "src/redux/memorySlice";
import { colors } from "src/style/colors";
import {
  getDayOfYearIndices,
  Passage,
  parsePassageString,
} from "src/app/utils";
import { spacing } from "src/style/layout";
import { styles } from "./TodayScreen.styles";
import {
  getMemoryPassageText,
  selectMemoryAcronym,
} from "src/redux/memorySlice";
import { selectAudioUrl, selectPassageHeader } from "src/redux/esvSlice";
import {
  getNotifications,
  selectNotifications,
} from "src/redux/notificationsSlice";
import {
  getSubscribedPlans,
  selectHasLoadedSubscribedPlans,
  selectSubscribedPlans,
  storeSubscribedPlans,
} from "src/redux/settingsSlice";
import Animated, {
  FadeIn,
  FadeOut,
  FadeInRight,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";
import { getEpisodes, selectCurrentEpisode } from "src/redux/podcastSlice";
import {
  selectAuthIsInitialized,
  selectAuthIsSyncing,
  selectIsAuthenticated,
  selectIsMember,
} from "src/redux/authSlice";
import {
  fetchDailyPrayerAssignment,
  selectHasPrayerError,
  selectIsFallbackPrayerAssignment,
  selectIsLoadingPrayer,
  selectPrayerAssignment,
  selectPrayerAssignmentDate,
} from "src/redux/memberSlice";
import { MemberAvatar } from "src/components";
import thumbnail from "../../../assets/podcast-icon.png";
import icon from "../../../assets/icon.png";
import { FeedItem } from "react-native-rss-parser";
import TrackPlayer, { Track } from "react-native-track-player";
import { initializeTrackPlayer } from "src/services/trackPlayerSetup";
import { playPassageAudio } from "src/services/passageAudio";
import { store } from "src/app/store";
import { stopMemoryAudioSession } from "src/redux/memoryAudioSlice";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { canUseLiquidGlass } from "src/services/liquidGlassSupport";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - No types for this package
import Bar from "react-native-progress/Bar";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { getPressFeedbackStyle } from "src/style/eink";

const playEpisode = async (episode: FeedItem) => {
  const isTrackPlayerInitialized = await initializeTrackPlayer();
  if (!isTrackPlayerInitialized) {
    return;
  }

  await store.dispatch(stopMemoryAudioSession());
  await TrackPlayer.reset();
  const track: Track = {
    url: episode.enclosures[0].url,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    artwork: icon,
    title: episode.title,
    artist: "Sovereign Hope Church",
    date: episode.published,
    description: episode.description,
    duration: Number.parseInt(episode.enclosures[0].length, 10) / 60,
  };
  await TrackPlayer.add(track);
  await TrackPlayer.play();
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

type Props = NativeStackScreenProps<RootStackParamList, "This Week">;

export const TodayScreen: React.FunctionComponent<Props> = ({
  navigation,
}: Props) => {
  // Custom hooks
  const dispatch = useAppDispatch();
  const miniPlayerHeight = useMiniPlayerHeight();
  const insets = useSafeAreaInsets();
  const { height: tabBarHeight } = useTabBarHeightContext();
  const readingPlanDay = useAppSelector(selectDailyReadingPlan);
  const readingPlanProgress = useAppSelector(selectReadingPlanProgressState);
  const readingPlanWeek = useAppSelector(selectWeekReadingPlan);
  const memoryPassageAcronym = useAppSelector(selectMemoryAcronym);
  const isLoading = useAppSelector(selectIsLoading);
  const isMemoryPassageLoading = useAppSelector(selectIsMemoryLoading);
  const theme = useTheme();
  const notifications = useAppSelector(selectNotifications);
  const subscribedPlans = useAppSelector(selectSubscribedPlans);
  const hasLoadedSubscribedPlans = useAppSelector(
    selectHasLoadedSubscribedPlans
  );
  const availablePlans = useAppSelector(selectAvailablePlans);
  const [hasInitializedPosition, setHasInitializedPosition] = useState(false);
  const podcastEpisode = useAppSelector(selectCurrentEpisode);
  const [shouldShowLoadingIndicator, setShouldShowLoadingIndicator] =
    useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authIsInitialized = useAppSelector(selectAuthIsInitialized);
  const authIsSyncing = useAppSelector(selectAuthIsSyncing);
  const isMember = useAppSelector(selectIsMember);
  const prayerAssignment = useAppSelector(selectPrayerAssignment);
  const prayerAssignmentDate = useAppSelector(selectPrayerAssignmentDate);
  const isFallbackPrayerAssignment = useAppSelector(
    selectIsFallbackPrayerAssignment
  );
  const isLoadingPrayerAssignment = useAppSelector(selectIsLoadingPrayer);
  const hasPrayerAssignmentError = useAppSelector(selectHasPrayerError);
  const { isTablet } = useTabletLayout();
  const readingAudioUrl = useAppSelector(selectAudioUrl);
  const readingAudioTitle = useAppSelector(selectPassageHeader);
  const uiPreferences = useUiPreferences();

  // Master-detail state (tablet only)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>();
  // Wide layout is active on tablet only when the detail pane is closed
  const useWideLayout = isTablet && selectedDayIndex === undefined;
  const [masterDetailPassages, setMasterDetailPassages] = useState<Passage[]>(
    []
  );
  const [detailContentWidth, setDetailContentWidth] = useState<number>();

  // Ref Hooks
  const appState = useRef(AppState.currentState);
  const readingScrollViewRef = useRef<FlatList<ReadingPlanDay>>(null);
  const pendingScrollAnimatedRef = useRef(true);

  // Memoized values
  // Find first day with actual memory content (skip empty placeholder days)
  const weeklyMemoryDay = useMemo(
    () =>
      readingPlanWeek?.days.find(
        (day) => day?.memory?.passage && day.memory.passage.length > 0
      ),
    [readingPlanWeek]
  );

  // Effect hooks
  useEffect(() => {
    const handler = (nextAppState: AppStateStatus) => {
      const today = new Date();
      if (
        /inactive|background/.test(appState.current) &&
        nextAppState === "active" &&
        currentDate.getDate() !== today.getDate()
      ) {
        setHasInitializedPosition(false);
        setShouldShowLoadingIndicator(true);
        setCurrentDate(today);

        void dispatch(getAvailablePlans());
        void dispatch(getSubscribedPlans());
        void dispatch(getReadingPlan());
        void dispatch(getReadingPlanProgressState());
        void dispatch(getNotifications());
        void dispatch(getEpisodes());
      }
      appState.current = nextAppState;
    };
    const listener = AppState.addEventListener("change", handler);

    return () => {
      listener.remove();
    };
  }, [currentDate, dispatch]);

  useEffect(() => {
    setHasInitializedPosition(false);
    setShouldShowLoadingIndicator(true);

    void dispatch(getAvailablePlans());
    void dispatch(getSubscribedPlans());
    void dispatch(getReadingPlan());
    void dispatch(getReadingPlanProgressState());
    void dispatch(getNotifications());
    void dispatch(getEpisodes());
  }, [dispatch]);

  useEffect(() => {
    void dispatch(getReadingPlan());
    void dispatch(getReadingPlanProgressState());
  }, [availablePlans, subscribedPlans, dispatch]);

  useEffect(() => {
    const currentYear = currentDate.getFullYear();
    const shouldWaitForAuthSync =
      isAuthenticated && (!authIsInitialized || authIsSyncing);
    if (
      currentYear > 2024 &&
      !shouldWaitForAuthSync &&
      hasLoadedSubscribedPlans &&
      availablePlans.length > 0
    ) {
      // Check each subscribed plan for expiration
      const stillValidPlans: string[] = [];
      let needsPlanPicker = false;

      for (const subscribedPlan of subscribedPlans) {
        const planYear = Number.parseInt(subscribedPlan.split(".")[0], 10);
        const isMultiYear = subscribedPlan.endsWith(".1");

        if (isMultiYear) {
          // Multi-year plans (like Two Year Bible) auto-continue
          // They're handled in getReadingPlan thunk which auto-upgrades
          stillValidPlans.push(subscribedPlan);
        } else {
          // One-year plans expire when the year changes
          if (planYear === currentYear) {
            stillValidPlans.push(subscribedPlan);
          } else {
            // Plan has expired - need to show picker
            needsPlanPicker = true;
          }
        }
      }

      // Update subscriptions if any were culled
      if (stillValidPlans.length !== subscribedPlans.length) {
        void dispatch(storeSubscribedPlans(stillValidPlans));
      }

      // Show picker if no valid plans remain OR if we explicitly need it
      if (stillValidPlans.length === 0 || needsPlanPicker) {
        navigation.navigate("Available Plans");
      }
    }
  }, [
    subscribedPlans,
    hasLoadedSubscribedPlans,
    availablePlans,
    currentDate,
    isAuthenticated,
    authIsInitialized,
    authIsSyncing,
    dispatch,
    navigation,
  ]);

  useEffect(() => {
    const passage = weeklyMemoryDay?.memory.passage;
    if (passage && !memoryPassageAcronym) {
      void dispatch(
        getMemoryPassageText({
          passage: parsePassageString(passage),
        })
      );
    }
  }, [weeklyMemoryDay, memoryPassageAcronym, dispatch]);

  useEffect(() => {
    if (!isMember) {
      return;
    }
    void dispatch(fetchDailyPrayerAssignment());
  }, [dispatch, isMember, currentDate]);

  React.useLayoutEffect(() => {
    navigation.setOptions({});
  }, [navigation]);

  useEffect(() => {
    if (!isLoading && !!readingPlanDay && !!readingPlanProgress) {
      setShouldShowLoadingIndicator(false);
    }
  }, [isLoading, readingPlanDay, readingPlanProgress]);

  // Event handlers
  const handleCompleteDay = (isComplete: boolean, dayIndex: number) => {
    if (isComplete) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.selectionAsync();
    }
    if (readingPlanProgress) {
      const { weekIndex } = getDayOfYearIndices(currentDate);
      const tempPlan: ReadingPlanProgressState =
        // This is disabled because structuredClone isn't available on hermes
        // eslint-disable-next-line unicorn/prefer-structured-clone
        JSON.parse(
          JSON.stringify(readingPlanProgress)
        ) as ReadingPlanProgressState;
      tempPlan.weeks[weekIndex].days[dayIndex].isCompleted = isComplete;
      void dispatch(storeReadingPlanProgressState(tempPlan));
    }
  };

  // Master-detail hooks (must be after handleCompleteDay)
  const onMasterDetailComplete = useCallback(() => {
    if (selectedDayIndex !== undefined && masterDetailPassages.length > 1) {
      handleCompleteDay(true, selectedDayIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedDayIndex,
    masterDetailPassages.length,
    readingPlanProgress,
    currentDate,
    dispatch,
  ]);

  const onMasterDetailDone = useCallback(() => {
    setSelectedDayIndex(undefined);
    setMasterDetailPassages([]);
  }, []);

  const passageLoader = usePassageLoader(
    masterDetailPassages,
    onMasterDetailComplete,
    onMasterDetailDone
  );

  const handleDetailLayout = useCallback((event: LayoutChangeEvent) => {
    setDetailContentWidth(event.nativeEvent.layout.width);
  }, []);

  const handleReadPress = (dayIndex: number) => {
    if (!readingPlanWeek) return;

    const readingPassages = readingPlanWeek.days[dayIndex].reading
      .filter((reading) => reading !== "TBD" && reading !== "")
      .map((reading) => parsePassageString(reading));

    // Build Memory Passage
    const memoryPassage = parsePassageString(
      readingPlanWeek.days[dayIndex].memory.passage,
      readingPlanWeek.days[dayIndex].memory.heading
    );

    memoryPassage.isMemory = true;

    const allPassages = [...readingPassages, memoryPassage];

    if (isTablet) {
      setSelectedDayIndex(dayIndex);
      setMasterDetailPassages(allPassages);
    } else {
      navigation.navigate("Read", {
        passages: allPassages,
        onComplete: () => handleCompleteDay(true, dayIndex),
      });
    }
  };

  const handlePracticePress = () => {
    if (readingPlanDay) {
      // Build Memory Passage
      const memoryPassage = parsePassageString(
        readingPlanDay.memory.passage,
        readingPlanDay.memory.heading
      );

      memoryPassage.isMemory = true;

      if (isTablet) {
        setSelectedDayIndex(getDayOfYearIndices(currentDate).dayIndex);
        setMasterDetailPassages([memoryPassage]);
      } else {
        navigation.navigate("Read", {
          passages: [memoryPassage],
          onComplete: () => {},
        });
      }
    }
  };

  const handleGeneratePrayerAssignment = () => {
    void dispatch(fetchDailyPrayerAssignment({ generateIfMissing: true }));
  };

  const showSelectFontSize = useCallback(() => {
    navigation.navigate("Font Size");
  }, [navigation]);

  const playReadingAudio = useCallback(async () => {
    if (!readingAudioUrl) {
      return;
    }
    try {
      await playPassageAudio(readingAudioUrl, readingAudioTitle ?? "");
    } catch {
      // Audio playback failure is non-critical
    }
  }, [readingAudioTitle, readingAudioUrl]);

  const getReadingPlanProgressPercentage = () => {
    let completedDays = 0;
    let totalDays = 0;
    readingPlanProgress?.weeks.forEach((week) => {
      week.days.forEach((day) => {
        totalDays++;
        if (day.isCompleted) {
          completedDays++;
        }
      });
    });
    return completedDays / totalDays;
  };

  // Constants
  const themedStyles = styles({
    theme,
    isEinkMode: uiPreferences.isEinkMode,
  });
  const actionColor = uiPreferences.isEinkMode
    ? theme.colors.primary
    : colors.accent;
  const currentDayIndex = getDayOfYearIndices(currentDate).dayIndex;
  const subscribedPlan = availablePlans.find(
    (plan) => plan.id === subscribedPlans[0]
  );
  const shouldShowMemoryLoadingIndicator =
    isMemoryPassageLoading || memoryPassageAcronym === undefined;
  const memoryPassageReference = readingPlanWeek?.days[0]?.memory.passage;
  const memoryPassage = memoryPassageReference
    ? parsePassageString(
        memoryPassageReference,
        readingPlanWeek?.days[0]?.memory.heading
      )
    : undefined;
  if (memoryPassage) {
    memoryPassage.isMemory = true;
  }
  const readingPlanCompletionPercentage = getReadingPlanProgressPercentage();
  const splitDetailTopInset = useMemo(() => {
    if (!isTablet || Platform.OS !== "ios") {
      return insets.top;
    }

    // On iPad iOS 26, the liquid-glass tab bar sits at the top and can
    // intercept touches if this inset is underestimated before layout settles.
    const fallbackTopTabBarHeight = 72;
    const effectiveTopTabBarHeight = Math.max(
      tabBarHeight,
      fallbackTopTabBarHeight
    );

    return insets.top + effectiveTopTabBarHeight;
  }, [insets.top, isTablet, tabBarHeight]);
  const shouldUseLiquidGlassButtons = canUseLiquidGlass(Platform.OS, {
    isGlassEffectCheck: isGlassEffectAPIAvailable,
    isLiquidGlassCheck: isLiquidGlassAvailable,
  });
  // We can do this because we really only need en US
  const weekdayMap = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const scrollToToday = useCallback(
    (animated = !uiPreferences.disableAnimations) => {
      const dayCount = readingPlanWeek?.days.length ?? 0;
      if (!readingScrollViewRef.current || dayCount === 0) {
        return;
      }

      pendingScrollAnimatedRef.current =
        animated && !uiPreferences.disableAnimations;
      const targetIndex =
        currentDayIndex < dayCount ? currentDayIndex : dayCount - 1;

      readingScrollViewRef.current.scrollToIndex({
        index: targetIndex,
        animated: pendingScrollAnimatedRef.current,
      });
    },
    [currentDayIndex, readingPlanWeek, uiPreferences.disableAnimations]
  );

  const renderReadingItem: ListRenderItem<ReadingPlanDay> = ({
    item,
    index,
  }) => {
    if (item.reading.length === 0 || item.reading[0] === "") {
      // eslint-disable-next-line unicorn/no-null
      return null;
    }
    const key = item.reading.join("");
    return (
      <Pressable
        key={key}
        onPress={() => handleReadPress(index)}
        accessibilityRole="button"
        style={({ pressed }) => [
          themedStyles.contentCard,
          {
            marginRight: 0,
            ...getPressFeedbackStyle(pressed, uiPreferences.isEinkMode),
          },
        ]}
      >
        <Pressable
          onPress={() => handleCompleteDay(!item.isComplete, index)}
          accessibilityRole="button"
          style={({ pressed }) =>
            getPressFeedbackStyle(pressed, uiPreferences.isEinkMode)
          }
        >
          {item.isComplete ? (
            <Animated.View
              entering={
                uiPreferences.disableAnimations
                  ? undefined
                  : FadeIn.duration(250)
              }
              exiting={
                uiPreferences.disableAnimations
                  ? undefined
                  : FadeOut.duration(250)
              }
            >
              <Ionicons
                name="checkbox"
                size={36}
                color={
                  uiPreferences.isEinkMode ? theme.colors.primary : colors.green
                }
              />
            </Animated.View>
          ) : (
            <Ionicons
              name="square-outline"
              size={36}
              color={theme.colors.border}
            />
          )}
        </Pressable>

        <View
          style={{
            ...themedStyles.contentCardColumn,
            marginLeft: spacing.medium,
          }}
        >
          <Text style={themedStyles.contentCardHeader}>
            {currentDayIndex === index
              ? "Today"
              : currentDayIndex === index - 1
              ? "Tomorrow"
              : currentDayIndex === index + 1
              ? "Yesterday"
              : weekdayMap[index]}
          </Text>
          {item?.reading.map((reading) => (
            <Text style={themedStyles.text} key={reading}>
              {reading}
            </Text>
          ))}
        </View>
        <Ionicons
          name="chevron-forward"
          size={24}
          color={theme.colors.border}
          style={themedStyles.disclosureIcon}
        />
      </Pressable>
    );
  };

  useEffect(() => {
    if (hasInitializedPosition || shouldShowLoadingIndicator) {
      return;
    }
    const dayCount = readingPlanWeek?.days.length ?? 0;
    if (!readingScrollViewRef.current || dayCount === 0) {
      return;
    }

    const interaction = InteractionManager.runAfterInteractions(() => {
      scrollToToday(false);
      setHasInitializedPosition(true);
    });

    return () => {
      interaction.cancel();
    };
  }, [
    readingPlanWeek,
    shouldShowLoadingIndicator,
    hasInitializedPosition,
    scrollToToday,
  ]);

  const renderMemoryCard = (tabletStyle?: object) => (
    <View
      style={[themedStyles.contentCard, themedStyles.memoryCard, tabletStyle]}
    >
      <Pressable
        onPress={handlePracticePress}
        accessibilityRole="button"
        style={({ pressed }) => [
          themedStyles.memoryPassageButton,
          getPressFeedbackStyle(pressed, uiPreferences.isEinkMode),
        ]}
      >
        <View style={themedStyles.contentCardColumn}>
          {weeklyMemoryDay?.memory.heading && (
            <Text style={themedStyles.contentCardHeader}>
              {weeklyMemoryDay?.memory.heading}
            </Text>
          )}
          <Text style={themedStyles.contentCardHeader}>
            {weeklyMemoryDay?.memory.passage}
          </Text>
          {shouldShowMemoryLoadingIndicator ? (
            <ActivityIndicator size="small" color={theme.colors.text} />
          ) : (
            <Animated.View
              entering={
                uiPreferences.disableAnimations
                  ? undefined
                  : FadeIn.duration(500)
              }
              exiting={uiPreferences.disableAnimations ? undefined : FadeOut}
              layout={
                uiPreferences.disableAnimations ? undefined : LinearTransition
              }
            >
              <Text
                style={{
                  ...themedStyles.text,
                  letterSpacing: 2,
                }}
              >
                {memoryPassageAcronym}
              </Text>
            </Animated.View>
          )}
        </View>
        <Ionicons
          name="chevron-forward"
          size={24}
          color={theme.colors.border}
          style={themedStyles.disclosureIcon}
        />
      </Pressable>
      {memoryPassageReference && memoryPassage ? (
        <MemoryAudioCard
          verseReference={memoryPassageReference}
          passage={memoryPassage}
          embedded
        />
      ) : undefined}
    </View>
  );

  const renderPrayerSection = (tabletStyle?: object) => (
    <View style={[themedStyles.contentCard, tabletStyle]}>
      <View style={themedStyles.contentCardColumn}>
        {isLoadingPrayerAssignment && !prayerAssignment ? (
          <ActivityIndicator size="small" color={theme.colors.text} />
        ) : hasPrayerAssignmentError && !prayerAssignment ? (
          <>
            <Text style={themedStyles.prayerStateText}>
              We could not load your prayer assignments right now.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                themedStyles.prayerActionButton,
                getPressFeedbackStyle(pressed, uiPreferences.isEinkMode),
              ]}
              onPress={() => {
                void dispatch(fetchDailyPrayerAssignment());
              }}
            >
              <Text style={themedStyles.prayerActionButtonText}>Try again</Text>
            </Pressable>
          </>
        ) : !prayerAssignment || prayerAssignment.members.length === 0 ? (
          <>
            <Text style={themedStyles.prayerStateText}>
              No prayer assignments yet for today.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                themedStyles.prayerActionButton,
                getPressFeedbackStyle(pressed, uiPreferences.isEinkMode),
              ]}
              disabled={isLoadingPrayerAssignment}
              onPress={handleGeneratePrayerAssignment}
            >
              <Text style={themedStyles.prayerActionButtonText}>
                Get Today&apos;s Prayer Assignments
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            {isFallbackPrayerAssignment && prayerAssignmentDate ? (
              <>
                <Text style={themedStyles.prayerAssignmentMeta}>
                  Showing assignments from {prayerAssignmentDate}.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    themedStyles.prayerActionButton,
                    getPressFeedbackStyle(pressed, uiPreferences.isEinkMode),
                  ]}
                  disabled={isLoadingPrayerAssignment}
                  onPress={handleGeneratePrayerAssignment}
                >
                  <Text style={themedStyles.prayerActionButtonText}>
                    Get today&apos;s prayer assignment
                  </Text>
                </Pressable>
              </>
            ) : undefined}
            <View style={themedStyles.prayerAssignmentList}>
              {prayerAssignment.members.map((member) => (
                <View key={member.uid} style={themedStyles.prayerAssignmentRow}>
                  <MemberAvatar
                    size={44}
                    photoURL={member.photoURL}
                    displayName={member.displayName}
                  />
                  <Text style={themedStyles.prayerAssignmentName}>
                    {member.displayName}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderResourcesCard = (tabletStyle?: object) => (
    <>
      {podcastEpisode && (
        <Pressable
          onPress={() => void playEpisode(podcastEpisode)}
          accessibilityRole="button"
          key={podcastEpisode.title}
          style={({ pressed }) => [
            themedStyles.contentCard,
            tabletStyle,
            getPressFeedbackStyle(pressed, uiPreferences.isEinkMode),
          ]}
        >
          <Image
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            source={thumbnail}
            style={themedStyles.image}
            accessibilityIgnoresInvertColors
          />
          <View
            style={{
              ...themedStyles.contentCardColumn,
              marginLeft: spacing.medium,
            }}
          >
            <Text style={themedStyles.contentCardHeader}>
              {podcastEpisode.title}
            </Text>
            <Text style={themedStyles.text}>
              {podcastEpisode.description.trim()}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={theme.colors.border}
            style={themedStyles.disclosureIcon}
          />
        </Pressable>
      )}
    </>
  );

  return (
    <SafeAreaView style={themedStyles.screen} edges={["left", "right"]}>
      {shouldShowLoadingIndicator ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.text}
          style={themedStyles.loadingContainer}
        />
      ) : (
        <Animated.View
          layout={
            uiPreferences.disableAnimations
              ? undefined
              : LinearTransition.duration(280)
          }
          style={
            isTablet && selectedDayIndex !== undefined
              ? themedStyles.splitView
              : themedStyles.splitViewSingle
          }
        >
          <Animated.View
            layout={
              uiPreferences.disableAnimations
                ? undefined
                : LinearTransition.duration(280)
            }
            style={{ flex: 1 }}
          >
            <Animated.ScrollView
              entering={
                uiPreferences.disableAnimations
                  ? undefined
                  : FadeIn.duration(500)
              }
              exiting={
                uiPreferences.disableAnimations
                  ? undefined
                  : FadeOut.duration(500)
              }
              style={themedStyles.scrollView}
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={{
                paddingBottom: miniPlayerHeight + insets.bottom,
              }}
            >
              <Animated.View
                entering={
                  uiPreferences.disableAnimations
                    ? undefined
                    : FadeIn.duration(500)
                }
                style={themedStyles.notifications}
              >
                {notifications?.map((notification) => (
                  <Pressable
                    onPress={() =>
                      void Linking.openURL(notification.link ?? "")
                    }
                    accessibilityRole="button"
                    key={notification.id}
                    style={({ pressed }) => [
                      themedStyles.notificationBox,
                      getPressFeedbackStyle(pressed, uiPreferences.isEinkMode, {
                        pressedOpacity: 0.5,
                      }),
                    ]}
                  >
                    <View style={themedStyles.notificationInfo}>
                      <Text style={themedStyles.notificationTitle}>
                        {notification.title}
                      </Text>
                      <Text style={themedStyles.notificationDetails}>
                        {notification.details}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={theme.colors.border}
                      style={themedStyles.disclosureIcon}
                    />
                  </Pressable>
                ))}
              </Animated.View>
              <View style={themedStyles.content}>
                {/* Reading Section */}
                <Animated.View
                  entering={
                    uiPreferences.disableAnimations
                      ? undefined
                      : FadeIn.duration(500)
                  }
                >
                  <View style={themedStyles.headerRow}>
                    <Text style={themedStyles.header}>Reading</Text>
                    <View style={{ flexDirection: "row", gap: spacing.medium }}>
                      <Pressable
                        style={({ pressed }) => [
                          themedStyles.textButton,
                          getPressFeedbackStyle(
                            pressed,
                            uiPreferences.isEinkMode
                          ),
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Reading Plan"
                        accessibilityHint="Opens the full reading plan"
                        onPress={() => {
                          navigation.navigate("Reading Plan");
                        }}
                      >
                        <Text style={themedStyles.textButtonLabel}>Plan</Text>
                      </Pressable>
                      {!useWideLayout && (
                        <Pressable
                          style={({ pressed }) => [
                            themedStyles.textButton,
                            getPressFeedbackStyle(
                              pressed,
                              uiPreferences.isEinkMode
                            ),
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Show Today"
                          accessibilityHint="Scrolls the reading list to today"
                          onPress={() => {
                            scrollToToday();
                          }}
                        >
                          <Text style={themedStyles.textButtonLabel}>
                            Today
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Week Grid (wide tablet) or Horizontal FlatList (phone / narrow) */}
                  {useWideLayout ? (
                    <WeekGrid
                      days={readingPlanWeek?.days ?? []}
                      currentDayIndex={currentDayIndex}
                      onDayPress={handleReadPress}
                      onToggleComplete={handleCompleteDay}
                    />
                  ) : (
                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      data={readingPlanWeek?.days}
                      renderItem={renderReadingItem}
                      style={themedStyles.scrollRow}
                      ref={readingScrollViewRef}
                      onScrollToIndexFailed={(info) => {
                        if (!readingScrollViewRef.current) {
                          return;
                        }
                        readingScrollViewRef.current.scrollToIndex({
                          index: Math.max(info.highestMeasuredFrameIndex, 0),
                          animated: false,
                        });
                        setTimeout(() => {
                          if (readingScrollViewRef.current) {
                            readingScrollViewRef.current.scrollToIndex({
                              index: info.index,
                              animated: pendingScrollAnimatedRef.current,
                            });
                          }
                        }, 50);
                      }}
                      contentContainerStyle={{
                        marginTop: spacing.small,
                        paddingRight: spacing.large,
                      }}
                    />
                  )}

                  <Text style={themedStyles.subHeader}>
                    {subscribedPlan?.title ?? currentDate.getFullYear()}
                  </Text>
                  {!!readingPlanCompletionPercentage && (
                    <Bar
                      progress={readingPlanCompletionPercentage}
                      // eslint-disable-next-line unicorn/no-null
                      width={null}
                      color={colors.green}
                      animationType="timing"
                      animationConfig={{
                        duration: uiPreferences.disableAnimations ? 0 : 500,
                      }}
                      indeterminate={readingPlanCompletionPercentage <= 0}
                      style={{
                        marginHorizontal: spacing.large,
                        marginBottom: spacing.large,
                      }}
                    />
                  )}
                </Animated.View>

                {/* Dashboard: 2-column on wide tablet, single column on phone / narrow */}
                {useWideLayout ? (
                  <View style={themedStyles.dashboardGrid}>
                    {/* Left column: Memory */}
                    <View style={themedStyles.dashboardColumn}>
                      <View style={themedStyles.headerRow}>
                        <Text style={themedStyles.header}>Memory</Text>
                      </View>
                      {renderMemoryCard(themedStyles.contentCardTablet)}
                    </View>

                    {/* Right column: Prayer (if member) or Resources */}
                    <View style={themedStyles.dashboardColumn}>
                      {isMember ? (
                        <>
                          <View style={themedStyles.headerRow}>
                            <Text style={themedStyles.header}>
                              Prayer Assignments
                            </Text>
                          </View>
                          {renderPrayerSection(themedStyles.contentCardTablet)}
                        </>
                      ) : (
                        <>
                          <View style={themedStyles.headerRow}>
                            <Text style={themedStyles.header}>Resources</Text>
                            <Pressable
                              style={({ pressed }) => [
                                themedStyles.textButton,
                                getPressFeedbackStyle(
                                  pressed,
                                  uiPreferences.isEinkMode
                                ),
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel="See all resources"
                              accessibilityHint="Opens the full resources screen"
                              onPress={() => {
                                navigation.navigate("Resources");
                              }}
                            >
                              <Text
                                style={{ color: actionColor, fontSize: 18 }}
                              >
                                See All
                              </Text>
                            </Pressable>
                          </View>
                          {renderResourcesCard(themedStyles.contentCardTablet)}
                        </>
                      )}
                    </View>
                  </View>
                ) : (
                  /* Phone: single column layout */
                  <>
                    <View style={themedStyles.headerRow}>
                      <Text style={themedStyles.header}>Memory</Text>
                    </View>
                    {renderMemoryCard()}
                    {isMember && (
                      <>
                        <View style={themedStyles.headerRow}>
                          <Text style={themedStyles.header}>
                            Prayer Assignments
                          </Text>
                        </View>
                        {renderPrayerSection()}
                      </>
                    )}
                  </>
                )}

                {/* Resources: full-width (shown here only when isMember on wide tablet, or always on phone/narrow) */}
                {(!useWideLayout || isMember) && (
                  <>
                    <View style={themedStyles.headerRow}>
                      <Text style={themedStyles.header}>Resources</Text>
                      <Pressable
                        style={({ pressed }) => [
                          themedStyles.textButton,
                          getPressFeedbackStyle(
                            pressed,
                            uiPreferences.isEinkMode
                          ),
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="See all resources"
                        accessibilityHint="Opens the full resources screen"
                        onPress={() => {
                          navigation.navigate("Resources");
                        }}
                      >
                        <Text style={themedStyles.textButtonLabel}>
                          See All
                        </Text>
                      </Pressable>
                    </View>
                    {renderResourcesCard()}
                  </>
                )}
                <View style={themedStyles.spacer} />
              </View>
            </Animated.ScrollView>
          </Animated.View>
          {isTablet && selectedDayIndex !== undefined && (
            <Animated.View
              layout={
                uiPreferences.disableAnimations
                  ? undefined
                  : LinearTransition.duration(280)
              }
              entering={
                uiPreferences.disableAnimations
                  ? undefined
                  : FadeInRight.duration(280)
              }
              exiting={
                uiPreferences.disableAnimations
                  ? undefined
                  : FadeOutRight.duration(220)
              }
              style={themedStyles.splitViewDetail}
              onLayout={handleDetailLayout}
            >
              <View
                style={[
                  themedStyles.splitViewDetailHeader,
                  { paddingTop: splitDetailTopInset + spacing.medium },
                ]}
              >
                <View style={themedStyles.splitViewDetailHeaderRow}>
                  <View style={themedStyles.splitViewDetailHeaderActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Text size"
                      accessibilityHint="Opens text size settings"
                      onPress={showSelectFontSize}
                      style={({ pressed }) => [
                        themedStyles.splitViewDetailHeaderButton,
                        shouldUseLiquidGlassButtons &&
                          themedStyles.splitViewDetailHeaderButtonLiquidGlass,
                        getPressFeedbackStyle(
                          pressed,
                          uiPreferences.isEinkMode,
                          {
                            pressedOpacity: 0.65,
                          }
                        ),
                      ]}
                    >
                      {shouldUseLiquidGlassButtons && (
                        <GlassView
                          style={themedStyles.splitViewDetailHeaderButtonGlass}
                          glassEffectStyle="regular"
                          colorScheme="auto"
                          isInteractive={false}
                          pointerEvents="none"
                        />
                      )}
                      <Ionicons
                        name="text-outline"
                        size={22}
                        color={actionColor}
                      />
                      <Text
                        style={themedStyles.splitViewDetailHeaderButtonText}
                      >
                        Text Size
                      </Text>
                    </Pressable>
                    {readingAudioUrl && readingAudioUrl !== "" && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Listen"
                        accessibilityHint="Plays reading audio for this passage"
                        onPress={() => void playReadingAudio()}
                        style={({ pressed }) => [
                          themedStyles.splitViewDetailHeaderButton,
                          shouldUseLiquidGlassButtons &&
                            themedStyles.splitViewDetailHeaderButtonLiquidGlass,
                          getPressFeedbackStyle(
                            pressed,
                            uiPreferences.isEinkMode,
                            {
                              pressedOpacity: 0.65,
                            }
                          ),
                        ]}
                      >
                        {shouldUseLiquidGlassButtons && (
                          <GlassView
                            style={
                              themedStyles.splitViewDetailHeaderButtonGlass
                            }
                            glassEffectStyle="regular"
                            colorScheme="auto"
                            isInteractive={false}
                            pointerEvents="none"
                          />
                        )}
                        <Ionicons
                          name="volume-high-outline"
                          size={22}
                          color={actionColor}
                        />
                        <Text
                          style={themedStyles.splitViewDetailHeaderButtonText}
                        >
                          Listen
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close reading"
                    accessibilityHint="Closes the reading detail pane"
                    onPress={onMasterDetailDone}
                    style={({ pressed }) => [
                      themedStyles.splitViewDetailCloseButton,
                      shouldUseLiquidGlassButtons &&
                        themedStyles.splitViewDetailCloseButtonLiquidGlass,
                      getPressFeedbackStyle(pressed, uiPreferences.isEinkMode, {
                        pressedOpacity: 0.65,
                      }),
                    ]}
                  >
                    {shouldUseLiquidGlassButtons && (
                      <GlassView
                        style={themedStyles.splitViewDetailHeaderButtonGlass}
                        glassEffectStyle="regular"
                        colorScheme="auto"
                        isInteractive={false}
                        pointerEvents="none"
                      />
                    )}
                    <Ionicons
                      name="close"
                      size={22}
                      color={theme.colors.text}
                    />
                  </Pressable>
                </View>
              </View>
              {passageLoader.isNavigatingPassages &&
              !passageLoader.hasLoadedCurrentPassage ? (
                <ActivityIndicator
                  size="large"
                  color={theme.colors.text}
                  style={themedStyles.loadingContainer}
                />
              ) : (
                <ReadScrollView
                  key={`${selectedDayIndex ?? "none"}`}
                  showMemoryButton={passageLoader.shouldShowMemoryButton}
                  heading={passageLoader.heading}
                  passageIndex={passageLoader.passageIndex}
                  showPreviousPassageButton={masterDetailPassages.length > 1}
                  canGoToPreviousPassage={passageLoader.passageIndex > 0}
                  isNavigatingPassages={passageLoader.isNavigatingPassages}
                  onPreviousPassage={passageLoader.handlePreviousPassage}
                  onNextPassage={passageLoader.handleNextPassage}
                  hasNextPassage={
                    passageLoader.passageIndex < masterDetailPassages.length - 1
                  }
                  miniPlayerHeight={miniPlayerHeight}
                  bottomInset={insets.bottom}
                  contentWidth={detailContentWidth}
                  adjustsForInsets
                />
              )}
            </Animated.View>
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
};
