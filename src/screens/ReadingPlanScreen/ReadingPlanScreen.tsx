/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, SectionList, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector, useAppDispatch } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTheme } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";
import {
  selectReadingPlan,
  ReadingPlanWeek,
  ReadingPlanDay,
  selectReadingPlanProgressState,
  storeReadingPlanProgressState,
  ReadingPlanProgressState,
} from "src/redux/readingPlanSlice";
import { colors } from "src/style/colors";
import {
  dayOfYearToDate,
  getDayOfYearIndices,
  parsePassageString,
} from "src/app/utils";
import { spacing } from "src/style/layout";
import { styles } from "./ReadingPlanScreen.styles";

type ReadingPlanProps = NativeStackScreenProps<
  RootStackParamList,
  "Reading Plan"
>;

// Extended type for list items with display metadata
// Note: isComplete is computed in the list item from Redux state, not passed in data
// This prevents re-rendering the entire list when a single day's progress changes
export type ReadingPlanListItemData = ReadingPlanDay & {
  weekIndex: number;
  originalDayIndex: number;
  displayDayNumber: number;
};

export const ReadingPlanListItem: React.FunctionComponent<{
  item: ReadingPlanListItemData;
  handleRowPress: (
    item: ReadingPlanDay,
    onCompleteDay: (isComplete: boolean) => void
  ) => void;
}> = ({
  item,
  handleRowPress,
}: {
  item: ReadingPlanListItemData;
  handleRowPress: (
    item: ReadingPlanDay,
    onCompleteDay: (isComplete: boolean) => void
  ) => void;
}) => {
  // Custom hooks
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const readingPlanProgress = useAppSelector(selectReadingPlanProgressState);

  // Compute isComplete from Redux state in the item itself
  // This allows only the affected item to re-render when progress changes
  const isComplete =
    readingPlanProgress?.weeks[item.weekIndex]?.days[item.originalDayIndex]
      ?.isCompleted ?? false;

  // Constants
  const themedStyles = styles({ theme });

  // Event handlers
  const handleCompleteDay = (newIsComplete: boolean) => {
    if (newIsComplete) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.selectionAsync();
    }
    if (readingPlanProgress) {
      const tempPlan: ReadingPlanProgressState =
        // This is disabled because structuredClone isn't available on hermes
        // eslint-disable-next-line unicorn/prefer-structured-clone
        JSON.parse(
          JSON.stringify(readingPlanProgress)
        ) as ReadingPlanProgressState;
      // Use originalDayIndex for progress tracking (matches Firestore structure)
      tempPlan.weeks[item.weekIndex].days[item.originalDayIndex].isCompleted =
        newIsComplete;
      void dispatch(storeReadingPlanProgressState(tempPlan));
    }
  };

  const weekIndex = item.weekIndex;

  return (
    <Pressable
      onPress={() => handleRowPress(item, handleCompleteDay)}
      accessibilityRole="button"
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.colors.background : theme.colors.card,
      })}
    >
      <View style={themedStyles.planItem}>
        {isComplete ? (
          <Ionicons
            name="checkmark-circle"
            size={36}
            color={colors.green}
            style={themedStyles.planItemCheckbox}
            onPress={() => handleCompleteDay(false)}
          />
        ) : (
          <Ionicons
            name="ellipse-outline"
            size={36}
            color={theme.colors.border}
            style={themedStyles.planItemCheckbox}
            onPress={() => handleCompleteDay(true)}
          />
        )}
        <View style={themedStyles.planItemContent}>
          <Text style={themedStyles.dayLabel}>Day {item.displayDayNumber}</Text>
          <View style={themedStyles.planItemReading}>
            <View style={themedStyles.planItemReadingColumn}>
              <Text style={themedStyles.planItemTitle}>Reading</Text>
              {item.reading.map((reading, readingIndex) => (
                <Text
                  key={`${reading}-${weekIndex}-${item.originalDayIndex}-${readingIndex}`}
                  style={themedStyles.planItemVerses}
                  lineBreakMode="middle"
                >
                  {reading}
                </Text>
              ))}
            </View>
            <View style={themedStyles.planItemReadingColumn}>
              <Text style={themedStyles.planItemTitle}>Memory</Text>
              <Text
                key={`${item.memory.passage}-${item.originalDayIndex}`}
                style={themedStyles.planItemVerses}
                lineBreakMode="middle"
              >
                {item.memory.passage}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View
        style={{
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
        }}
      />
    </Pressable>
  );
};

export const ReadingPlanScreen: React.FunctionComponent<ReadingPlanProps> = ({
  navigation,
}: ReadingPlanProps) => {
  const isIOS26OrNewer =
    Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26;

  // Custom hooks
  const readingPlan = useAppSelector(selectReadingPlan);
  // Note: Progress state is read by each list item directly, not at screen level
  // This prevents re-rendering entire list when a single day's progress changes
  const theme = useTheme();
  const miniPlayerHeight = useMiniPlayerHeight();
  const insets = useSafeAreaInsets();

  // Ref Hooks
  const scrollViewRef = useRef<SectionList<ReadingPlanListItemData>>(null);

  // State hooks
  const [listData, setListData] = useState<
    Array<{
      title: string;
      data: ReadingPlanListItemData[];
    }>
  >([]);
  const [hasInitializedPosition, setHasInitializedPosition] = useState(false);

  // Callback hooks

  // Effect hooks

  // Build list data structure only when reading plan changes (not on progress updates)
  // Progress/completion state is computed in each list item via Redux selector
  useEffect(() => {
    if (readingPlan) {
      const currentYear = new Date().getFullYear();

      const data = readingPlan.weeks
        .map((week: ReadingPlanWeek, weekIndex: number) => {
          // Filter to only non-empty days
          const nonEmptyDays = week.days
            .map((day: ReadingPlanDay, dayIndex) => {
              const hasContent =
                day.reading.length > 0 && day.reading[0] !== "";
              if (!hasContent) return;

              return {
                ...day,
                weekIndex,
                originalDayIndex: dayIndex, // Keep original for progress tracking
              };
            })
            .filter(Boolean)
            // Add displayDayNumber after filtering (resets each week, 1-indexed)
            .map((day, filteredIndex) => ({
              ...day,
              displayDayNumber: filteredIndex + 1,
            })) as ReadingPlanListItemData[];

          // Find first non-empty day's index for the header date
          const firstNonEmptyDayIndex = week.days.findIndex(
            (day) => day.reading.length > 0 && day.reading[0] !== ""
          );
          const headerDayIndex =
            firstNonEmptyDayIndex >= 0 ? firstNonEmptyDayIndex : 0;

          return {
            title: `Week ${weekIndex + 1} - ${dayOfYearToDate(
              currentYear,
              weekIndex,
              headerDayIndex
            )}`,
            data: nonEmptyDays,
          };
        })
        // Filter out weeks with no content (removes extra space at top)
        .filter((section) => section.data.length > 0);

      setListData(data);
    }
  }, [readingPlan]);

  useEffect(() => {
    if (!hasInitializedPosition) {
      const { weekIndex } = getDayOfYearIndices(new Date());
      if (scrollViewRef.current && listData.length > 0) {
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToLocation({
              sectionIndex:
                weekIndex < listData.length ? weekIndex : listData.length - 1,
              itemIndex: 1,
            });
            setHasInitializedPosition(true);
          }
        }, 1000);
      }
    }
  }, [scrollViewRef, listData, hasInitializedPosition]);

  React.useLayoutEffect(() => {
    const { weekIndex } = getDayOfYearIndices(new Date());
    const canScrollToToday = listData.length > 0;

    const scrollToToday = () => {
      if (!canScrollToToday || !scrollViewRef.current) {
        return;
      }

      const sectionIndex =
        weekIndex < listData.length ? weekIndex : listData.length - 1;
      scrollViewRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 1,
      });
    };

    if (isIOS26OrNewer) {
      navigation.setOptions({
        headerRight: undefined,
        unstable_headerRightItems: ({ tintColor }) => [
          {
            type: "button",
            label: "Today",
            onPress: scrollToToday,
            variant: "plain",
            tintColor: tintColor ?? colors.accent,
            sharesBackground: false,
            disabled: !canScrollToToday,
          },
        ],
      });
      return;
    }

    navigation.setOptions({
      unstable_headerRightItems: undefined,
      headerRight: () => (
        <Pressable
          style={{
            marginRight: spacing.large,
          }}
          accessibilityRole="button"
          onPress={scrollToToday}
          accessibilityState={{ disabled: !canScrollToToday }}
        >
          <Text style={{ color: colors.accent, fontSize: 18 }}>Today</Text>
        </Pressable>
      ),
    });
  }, [navigation, listData, isIOS26OrNewer]);

  // Event handlers
  const handleRowPress = (
    item: ReadingPlanDay,
    onCompleteDay: (isComplete: boolean) => void
  ) => {
    const readingPassages = item.reading
      .filter((reading) => reading !== "TBD")
      .map((reading) => parsePassageString(reading));

    // Build Memory Passage
    const memoryPassage = parsePassageString(
      item.memory.passage,
      item.memory.heading
    );

    memoryPassage.isMemory = true;

    navigation.navigate("Read", {
      passages: readingPassages?.concat(memoryPassage) ?? [],
      onComplete: () => onCompleteDay(true),
    });
  };

  // Constants
  const themedStyles = styles({ theme });

  return (
    <SafeAreaView edges={["left", "right"]} style={themedStyles.screen}>
      <SectionList
        ref={scrollViewRef}
        stickySectionHeadersEnabled
        bounces={false}
        contentContainerStyle={{
          paddingBottom: miniPlayerHeight + insets.bottom,
        }}
        onScrollToIndexFailed={() => {
          // Handle scroll to index failure gracefully
          // scrollToLocation may fail if item not yet rendered; initial scroll
          // will retry after 1s which typically allows items to render
        }}
        sections={listData}
        style={themedStyles.planList}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={21}
        keyExtractor={(item: ReadingPlanListItemData) =>
          `day-${item.displayDayNumber}-week-${item.weekIndex}`
        }
        renderItem={({ item }) => (
          <ReadingPlanListItem item={item} handleRowPress={handleRowPress} />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={themedStyles.sectionHeaderContainer}>
            <Text style={themedStyles.sectionHeaderText}>{title}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

/* eslint-enable react/prop-types */
