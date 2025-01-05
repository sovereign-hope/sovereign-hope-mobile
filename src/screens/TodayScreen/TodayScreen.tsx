import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  FlatList,
  Image,
  Linking,
  ListRenderItem,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { useAppSelector } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { getDayInWeek, getWeekNumber, parsePassageString } from "src/app/utils";
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
import thumbnail from "../../../assets/podcast-icon.png";
import icon from "../../../assets/icon.png";
import { FeedItem } from "react-native-rss-parser";
import TrackPlayer, { Track } from "react-native-track-player";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - No types for this package
import Bar from "react-native-progress/Bar";
import { selectShowChildrensPlan } from "src/redux/settingsSlice";

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
  const dispatch = useDispatch();
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
  const showChildrensPlan = useAppSelector(selectShowChildrensPlan);

  // Ref Hooks
  const appState = useRef(AppState.currentState);
  const readingScrollViewRef = useRef<FlatList<ReadingPlanDay>>(null);

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

        dispatch(getAvailablePlans());
        dispatch(getSubscribedPlans());
        dispatch(getReadingPlan());
        dispatch(getReadingPlanProgressState());
        dispatch(getNotifications());
      }
      appState.current = nextAppState;
    };
    const listener = AppState.addEventListener("change", handler);

    return () => {
      listener.remove();
    };
  }, []);

  useEffect(() => {
    setHasInitializedPosition(false);
    setShouldShowLoadingIndicator(true);

    dispatch(getAvailablePlans());
    dispatch(getSubscribedPlans());
    dispatch(getReadingPlan());
    dispatch(getReadingPlanProgressState());
    dispatch(getNotifications());
  }, [dispatch]);

  useEffect(() => {
    dispatch(getReadingPlan());
    dispatch(getReadingPlanProgressState());
  }, [availablePlans, subscribedPlans]);

  useEffect(() => {
    const hasActivePlan = subscribedPlans.length > 0;
    const currentYear = currentDate.getFullYear();
    if (
      currentYear > 2024 &&
      !hasActivePlan &&
      hasLoadedSubscribedPlans &&
      availablePlans.length > 0
    ) {
      // Do a quick check for old plans
      const newSubscriptions = subscribedPlans.filter((subscribedPlan) => {
        return availablePlans.some((plan) => plan.id === subscribedPlan);
      });
      // If any plans were culled because they aren't available, remove them
      if (newSubscriptions.length !== subscribedPlans.length) {
        dispatch(storeSubscribedPlans(newSubscriptions));
      }
      if (newSubscriptions.length === 0) {
        navigation.navigate("Available Plans");
      }
    }
  }, [subscribedPlans, hasLoadedSubscribedPlans, availablePlans]);

  useEffect(() => {
    const passage = readingPlanWeek?.days[0]?.memory.passage;
    if (passage && !memoryPassageAcronym) {
      dispatch(
        getMemoryPassageText({
          passage: parsePassageString(passage),
        })
      );
    }
  }, [readingPlanDay]);

  useEffect(() => {
    if (!hasInitializedPosition && !shouldShowLoadingIndicator) {
      const currentDayIndex = getDayInWeek() - 1;
      const readingPlanDayCount = readingPlanWeek?.days.length ?? 0;
      if (
        readingScrollViewRef.current &&
        readingPlanDayCount > 0 &&
        readingPlanDayCount > currentDayIndex
      ) {
        setTimeout(() => {
          if (readingScrollViewRef.current) {
            readingScrollViewRef.current.scrollToIndex({
              // Note to self: this doesn't work if index is 0!!!
              index: currentDayIndex,
            });
            setHasInitializedPosition(true);
          }
        }, 2000);
      }
    }
  }, [readingScrollViewRef, readingPlanWeek, shouldShowLoadingIndicator]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: undefined,
    });
  }, [navigation]);

  useEffect(() => {
    if (!isLoading && !!readingPlanDay && !!readingPlanProgress) {
      setTimeout(() => {
        setShouldShowLoadingIndicator(false);
      }, 250);
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
      const currentWeekIndex = getWeekNumber(currentDate).week - 1;
      const tempPlan: ReadingPlanProgressState =
        // This is disabled because structuredClone isn't available on hermes
        // eslint-disable-next-line unicorn/prefer-structured-clone
        JSON.parse(
          JSON.stringify(readingPlanProgress)
        ) as ReadingPlanProgressState;
      tempPlan.weeks[currentWeekIndex].days[dayIndex].isCompleted = isComplete;
      dispatch(storeReadingPlanProgressState(tempPlan));
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
  const currentDayIndex = getDayInWeek() - 1;
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
                    if (readingScrollViewRef.current) {
                      const numberOfDays = readingPlanWeek?.days.length ?? 0;
                      readingScrollViewRef.current.scrollToIndex({
                        index:
                          currentDayIndex < numberOfDays
                            ? currentDayIndex
                            : numberOfDays - 1,
                      });
                    }
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
                  console.log(info);
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
                {readingPlanWeek?.days[0]?.memory.heading && (
                  <Text style={themedStyles.contentCardHeader}>
                    {readingPlanWeek?.days[0]?.memory.heading}
                  </Text>
                )}
                <Text style={themedStyles.contentCardHeader}>
                  {readingPlanWeek?.days[0]?.memory.passage}
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
            <View style={themedStyles.headerRow}>
              <Text style={themedStyles.header}>Resources</Text>
            </View>
            {/* {showChildrensPlan && (
              <Pressable
                // onPress={() => navigation.push("Read")}
                accessibilityRole="button"
                style={({ pressed }) => [
                  themedStyles.contentCard,
                  {
                    opacity: pressed ? 0.7 : 1,
                    marginBottom: spacing.medium,
                  },
                ]}
              >
                <View style={themedStyles.contentCardColumn}>
                  <Text style={themedStyles.contentCardHeader}>
                    Children&apos;s Reading
                  </Text>
                  <Text style={themedStyles.text}>
                    Today&apos;s Bible reading for children
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.border}
                  style={themedStyles.disclosureIcon}
                />
              </Pressable>
            )} */}
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
            {/* <View style={themedStyles.contentCard}>
            <View style={themedStyles.contentCardColumn}>
              <Text style={themedStyles.memoryQuestionHeader}>
                Study Questions
              </Text>
              <Text style={themedStyles.memoryQuestionSubHeader}>Look Up</Text>
              <Text style={themedStyles.memoryQuestion}>
                What does this passage teach us about the Triune God, his
                character, and his plan to save us in the gospel?
              </Text>
              <Text style={themedStyles.memoryQuestionSubHeader}>Look In</Text>
              <Text style={themedStyles.memoryQuestion}>
                What does this passage teach us about our own hearts and lives,
                and the world we live in?
              </Text>
              <Text style={themedStyles.memoryQuestionSubHeader}>Look Out</Text>
              <Text style={themedStyles.memoryQuestion}>
                How does this passage influence the way we should act and think
                as Christians at home, at work, in relationships or as the
                church?
              </Text>
              <Text
                style={{
                  ...themedStyles.memoryQuestionHeader,
                  marginTop: spacing.large,
                }}
              >
                Thoughts for Reflection
              </Text>
              <Text style={themedStyles.memoryQuestion}>
                Write down one way this passage can influence our emotions and
                prayer life and be sure to set aside time to pray for that
                today.
              </Text>
            </View>
          </View> */}
            <View style={themedStyles.spacer} />
          </View>
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
};
