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
  ScrollView,
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
import { MiniPlayer } from "src/components";
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
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { selectCurrentEpisode } from "src/redux/podcastSlice";
import thumbnail from "../../../assets/podcast-icon.png";
import icon from "../../../assets/icon.png";
import { FeedItem } from "react-native-rss-parser";
import TrackPlayer, { Track } from "react-native-track-player";

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

  // Ref Hooks
  const appState = useRef(AppState.currentState);
  const readingScrollViewRef = useRef<FlatList<ReadingPlanDay>>(null);

  // Effect hooks
  useEffect(() => {
    const handler = (nextAppState: AppStateStatus) => {
      if (
        /inactive|background/.test(appState.current) &&
        nextAppState === "active"
      ) {
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
    dispatch(getAvailablePlans());
    dispatch(getSubscribedPlans());
    dispatch(getReadingPlan());
    dispatch(getReadingPlanProgressState());
    dispatch(getNotifications());
  }, [dispatch]);

  useEffect(() => {
    dispatch(getReadingPlan());
  }, [availablePlans, subscribedPlans]);

  useEffect(() => {
    const hasActivePlan = subscribedPlans.length > 0;
    if (
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
    if (passage) {
      dispatch(
        getMemoryPassageText({
          passage: parsePassageString(passage),
        })
      );
    }
  }, [readingPlanDay]);

  useEffect(() => {
    if (!hasInitializedPosition) {
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
        }, 100);
      }
    }
  }, [readingScrollViewRef, readingPlanWeek]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: undefined,
    });
  }, [navigation]);

  // Event handlers
  const handleCompleteDay = (isComplete: boolean, dayIndex: number) => {
    if (isComplete) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.selectionAsync();
    }
    if (readingPlanProgress) {
      const currentWeekIndex = getWeekNumber(new Date()).week - 1;
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
    if (readingPlanDay) {
      const readingPassages = readingPlanDay.reading.map((reading) =>
        parsePassageString(reading)
      );

      // Build Memory Passage
      const memoryPassage = parsePassageString(
        readingPlanDay.memory.passage,
        readingPlanDay.memory.heading
      );

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

      navigation.navigate("Read", {
        passages: [memoryPassage],
        onComplete: () => {},
      });
    }
  };

  // Constants
  const themedStyles = styles({ theme });
  const currentDayIndex = getDayInWeek() - 1;
  const shouldShowLoadingIndicator = isLoading && readingPlanDay === undefined;
  const shouldShowMemoryLoadingIndicator =
    isMemoryPassageLoading || memoryPassageAcronym === undefined;
  // We can do this because we really only need en US
  const weekdayMap = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const renderReadingItem: ListRenderItem<ReadingPlanDay> = ({
    item,
    index,
  }) => {
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
            <Text key={reading}>{reading}</Text>
          ))}
        </View>
        <Ionicons
          name="chevron-forward"
          size={24}
          color={colors.grey}
          style={themedStyles.disclosureIcon}
        />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={themedStyles.screen} edges={["left", "right"]}>
      <MiniPlayer id="sermons-mini-player" />
      <ScrollView
        style={themedStyles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={themedStyles.notifications}>
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
                color={colors.grey}
                style={themedStyles.disclosureIcon}
              />
            </Pressable>
          ))}
        </View>
        <View style={themedStyles.content}>
          {shouldShowLoadingIndicator ? (
            <View style={themedStyles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.text} />
            </View>
          ) : (
            <>
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
                      readingScrollViewRef.current.scrollToIndex({
                        index: currentDayIndex,
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
            </>
          )}
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
              <Text style={themedStyles.contentCardHeader}>
                {readingPlanWeek?.days[0]?.memory.heading}
              </Text>
              <Text>{readingPlanWeek?.days[0]?.memory.passage}</Text>
              {shouldShowMemoryLoadingIndicator ? (
                <View style={themedStyles.memoryLoadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.text} />
                </View>
              ) : (
                <Text style={themedStyles.memoryHelperText}>
                  {memoryPassageAcronym}
                </Text>
              )}
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.grey}
              style={themedStyles.disclosureIcon}
            />
          </Pressable>
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
                <Text>{podcastEpisode.description.trim()}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={colors.grey}
                style={themedStyles.disclosureIcon}
              />
            </Pressable>
          )}
          <View style={themedStyles.contentCard}>
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
          </View>
          <View style={themedStyles.spacer} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
