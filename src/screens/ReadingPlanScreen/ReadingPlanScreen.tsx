/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useState } from "react";
import { Pressable, SectionList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
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
  getWeekNumber,
  parsePassageString,
  weekDateToDate,
} from "src/app/utils";
import { spacing } from "src/style/layout";
import { styles } from "./ReadingPlanScreen.styles";

type ReadingPlanProps = NativeStackScreenProps<
  RootStackParamList,
  "Reading Plan"
>;

export const ReadingPlanListItem: React.FunctionComponent<{
  item: ReadingPlanDay;
  index: number;
  handleRowPress: (
    item: ReadingPlanDay,
    onCompleteDay: (isComplete: boolean) => void
  ) => void;
}> = ({
  item,
  index,
  handleRowPress,
}: {
  item: ReadingPlanDay;
  index: number;
  handleRowPress: (
    item: ReadingPlanDay,
    onCompleteDay: (isComplete: boolean) => void
  ) => void;
}) => {
  // Custom hooks
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const readingPlanProgress = useAppSelector(selectReadingPlanProgressState);

  // Constants
  const themedStyles = styles({ theme });

  // Event handlers
  const handleCompleteDay = (isComplete: boolean) => {
    if (isComplete) {
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
      tempPlan.weeks[item.weekIndex ?? 0].days[index].isCompleted = isComplete;
      void dispatch(storeReadingPlanProgressState(tempPlan));
    }
  };

  const weekIndex = item.weekIndex ?? 0;

  if (item.reading.length === 0 || item.reading[0] === "") {
    // eslint-disable-next-line unicorn/no-null
    return null;
  }

  return (
    <Pressable
      onPress={() => handleRowPress(item, handleCompleteDay)}
      accessibilityRole="button"
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.colors.background : theme.colors.card,
      })}
    >
      <View style={themedStyles.planItem}>
        {item.isComplete ? (
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
          <Text style={themedStyles.dayLabel}>Day {index + 1}</Text>
          <View style={themedStyles.planItemReading}>
            <View style={themedStyles.planItemReadingColumn}>
              <Text style={themedStyles.planItemTitle}>Reading</Text>
              {item.reading.map((reading, readingIndex) => (
                <Text
                  key={`${reading}-${weekIndex}-${index}-${readingIndex}`}
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
                key={`${item.memory.passage}-${index}`}
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
  // Custom hooks
  const readingPlan = useAppSelector(selectReadingPlan);
  const readingPlanProgress = useAppSelector(selectReadingPlanProgressState);
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const miniPlayerHeight = useMiniPlayerHeight();

  // Ref Hooks
  const scrollViewRef = useRef<SectionList<ReadingPlanDay>>(null);

  // State hooks
  const [listData, setListData] = useState<
    Array<{
      title: string;
      data: (ReadingPlanDay & { weekIndex: number; isComplete?: boolean })[];
    }>
  >([]);
  const [hasInitializedPosition, setHasInitializedPosition] = useState(false);

  // Callback hooks

  // Effect hooks

  useEffect(() => {
    if (readingPlan) {
      const currentYear = new Date().getFullYear();
      const data = readingPlan.weeks.map(
        (week: ReadingPlanWeek, weekIndex: number) => ({
          title: `Week ${weekIndex + 1} - ${weekDateToDate(
            currentYear,
            weekIndex + 1,
            1
          )}`,
          data: week.days.map((day: ReadingPlanDay, dayIndex) => {
            const dayIsComplete =
              readingPlanProgress?.weeks[weekIndex]?.days[dayIndex]
                .isCompleted ?? false;
            return {
              ...day,
              weekIndex,
              isComplete: dayIsComplete,
            };
          }),
        })
      );
      setListData(data);
    }
  }, [readingPlan, readingPlanProgress]);

  useEffect(() => {
    if (!hasInitializedPosition) {
      const currentWeek = getWeekNumber(new Date()).week;
      if (scrollViewRef.current && listData.length > 0) {
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToLocation({
              sectionIndex:
                currentWeek < listData.length
                  ? currentWeek - 1
                  : listData.length - 1,
              itemIndex: 1,
            });
            setHasInitializedPosition(true);
          }
        }, 1000);
      }
    }
  }, [scrollViewRef, listData, hasInitializedPosition]);

  React.useLayoutEffect(() => {
    const currentWeek = getWeekNumber(new Date()).week;
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          style={{
            marginRight: spacing.large,
          }}
          accessibilityRole="button"
          onPress={() => {
            if (scrollViewRef.current) {
              const sectionIndex =
                currentWeek < listData.length
                  ? currentWeek - 1
                  : listData.length - 1;
              scrollViewRef.current.scrollToLocation({
                sectionIndex,
                itemIndex: 1,
              });
            }
          }}
        >
          <Text style={{ color: colors.accent, fontSize: 18 }}>Today</Text>
        </Pressable>
      ),
    });
  }, [navigation, listData]);

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
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: miniPlayerHeight,
        }}
        scrollIndicatorInsets={{ top: headerHeight }}
        onScrollToIndexFailed={() => {
          // Handle scroll to index failure gracefully
        }}
        sections={listData}
        style={themedStyles.planList}
        initialNumToRender={400}
        keyExtractor={(item: ReadingPlanDay, index) =>
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `${item.reading ?? item.memory.passage}${index}`
        }
        renderItem={({ item, index }) => (
          <ReadingPlanListItem
            item={item}
            index={index}
            handleRowPress={handleRowPress}
          />
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
