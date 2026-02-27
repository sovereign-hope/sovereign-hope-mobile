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
  Linking,
  ListRenderItem,
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
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";
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
import { getDayOfYearIndices, parsePassageString } from "src/app/utils";
import { spacing } from "src/style/layout";
import { styles } from "./TodayScreen.styles";
import {
  getMemoryPassageText,
  selectMemoryAcronym,
} from "src/redux/memorySlice";
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
  LinearTransition,
} from "react-native-reanimated";
import { selectCurrentEpisode } from "src/redux/podcastSlice";
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
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - No types for this package
import Bar from "react-native-progress/Bar";

const playEpisode = async (episode: FeedItem) => {
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

  const handleReadPress = (dayIndex: number) => {
    if (readingPlanWeek) {
      const readingPassages = readingPlanWeek.days[dayIndex].reading
        .filter((reading) => reading !== "TBD" && reading !== "")
        .map((reading) => parsePassageString(reading));

      // Build Memory Passage
      const memoryPassage = parsePassageString(
        readingPlanWeek.days[dayIndex].memory.passage,
        readingPlanWeek.days[dayIndex].memory.heading
      );

      memoryPassage.isMemory = true;

      navigation.navigate("Read", {
        passages: readingPassages?.concat(memoryPassage) ?? [],
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

      navigation.navigate("Read", {
        passages: [memoryPassage],
        onComplete: () => {},
      });
    }
  };

  const handleGeneratePrayerAssignment = () => {
    void dispatch(fetchDailyPrayerAssignment({ generateIfMissing: true }));
  };

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
  const themedStyles = styles({ theme });
  const currentDayIndex = getDayOfYearIndices(currentDate).dayIndex;
  const subscribedPlan = availablePlans.find(
    (plan) => plan.id === subscribedPlans[0]
  );
  const shouldShowMemoryLoadingIndicator =
    isMemoryPassageLoading || memoryPassageAcronym === undefined;
  const readingPlanCompletionPercentage = getReadingPlanProgressPercentage();
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
    (animated = true) => {
      const dayCount = readingPlanWeek?.days.length ?? 0;
      if (!readingScrollViewRef.current || dayCount === 0) {
        return;
      }

      pendingScrollAnimatedRef.current = animated;
      const targetIndex =
        currentDayIndex < dayCount ? currentDayIndex : dayCount - 1;

      readingScrollViewRef.current.scrollToIndex({
        index: targetIndex,
        animated,
      });
    },
    [readingPlanWeek, currentDayIndex]
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
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Pressable
          onPress={() => handleCompleteDay(!item.isComplete, index)}
          accessibilityRole="button"
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {item.isComplete ? (
            <Animated.View
              entering={FadeIn.duration(250)}
              exiting={FadeOut.duration(250)}
            >
              <Ionicons name="checkbox" size={36} color={colors.green} />
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

  return (
    <SafeAreaView style={themedStyles.screen} edges={["left", "right"]}>
      {shouldShowLoadingIndicator ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.text}
          style={themedStyles.loadingContainer}
        />
      ) : (
        <Animated.ScrollView
          entering={FadeIn.duration(500)}
          exiting={FadeOut.duration(500)}
          layout={LinearTransition}
          style={themedStyles.scrollView}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingBottom: miniPlayerHeight + insets.bottom,
          }}
        >
          <Animated.View
            entering={FadeIn.duration(500)}
            style={themedStyles.notifications}
          >
            {notifications?.map((notification) => (
              <Pressable
                onPress={() => void Linking.openURL(notification.link ?? "")}
                accessibilityRole="button"
                key={notification.id}
                style={({ pressed }) => [
                  themedStyles.notificationBox,
                  {
                    opacity: pressed ? 0.5 : 1,
                  },
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
            <Animated.View entering={FadeIn.duration(500)}>
              <View style={themedStyles.headerRow}>
                <Text
                  style={{
                    ...themedStyles.header,
                  }}
                >
                  Reading
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    themedStyles.textButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  accessibilityRole="button"
                  onPress={() => {
                    scrollToToday();
                  }}
                >
                  <Text style={{ color: colors.accent, fontSize: 18 }}>
                    Show Today
                  </Text>
                </Pressable>
              </View>
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
                    duration: 500,
                  }}
                  indeterminate={readingPlanCompletionPercentage <= 0}
                  style={{
                    marginHorizontal: spacing.large,
                    marginBottom: spacing.large,
                  }}
                />
              )}
            </Animated.View>
            <View style={themedStyles.headerRow}>
              <Text style={themedStyles.header}>Memory</Text>
            </View>
            <Pressable
              onPress={handlePracticePress}
              accessibilityRole="button"
              style={({ pressed }) => [
                themedStyles.contentCard,
                {
                  opacity: pressed ? 0.7 : 1,
                },
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
                    entering={FadeIn.duration(500)}
                    exiting={FadeOut}
                    layout={LinearTransition}
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
            {isMember && (
              <>
                <View style={themedStyles.headerRow}>
                  <Text style={themedStyles.header}>Prayer Assignments</Text>
                </View>
                <View style={themedStyles.contentCard}>
                  <View style={themedStyles.contentCardColumn}>
                    {isLoadingPrayerAssignment && !prayerAssignment ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.text}
                      />
                    ) : hasPrayerAssignmentError && !prayerAssignment ? (
                      <>
                        <Text style={themedStyles.prayerStateText}>
                          We could not load your prayer assignments right now.
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          style={themedStyles.prayerActionButton}
                          onPress={() => {
                            void dispatch(fetchDailyPrayerAssignment());
                          }}
                        >
                          <Text style={themedStyles.prayerActionButtonText}>
                            Try again
                          </Text>
                        </Pressable>
                      </>
                    ) : !prayerAssignment ||
                      prayerAssignment.members.length === 0 ? (
                      <>
                        <Text style={themedStyles.prayerStateText}>
                          No prayer assignments yet for today.
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          style={themedStyles.prayerActionButton}
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
                              style={themedStyles.prayerActionButton}
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
                            <View
                              key={member.uid}
                              style={themedStyles.prayerAssignmentRow}
                            >
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
              </>
            )}
            <View style={themedStyles.headerRow}>
              <Text style={themedStyles.header}>Resources</Text>
            </View>
            {podcastEpisode && (
              <Pressable
                onPress={() => void playEpisode(podcastEpisode)}
                accessibilityRole="button"
                key={podcastEpisode.title}
                style={({ pressed }) => [
                  themedStyles.contentCard,
                  {
                    opacity: pressed ? 0.7 : 1,
                  },
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
            <View style={themedStyles.spacer} />
          </View>
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
};
