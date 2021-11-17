import React, { useEffect, useState } from "react";
import { SectionList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTheme } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import {
  selectReadingPlan,
  getReadingPlan,
  ReadingPlanWeek,
  ReadingPlanDay,
  selectReadingPlanProgressState,
  storeReadingPlanProgressState,
  getReadingPlanProgressState,
  ReadingPlanProgressState,
} from "src/redux/readingPlanSlice";
import { colors } from "src/style/colors";
import { styles } from "./ReadingPlanScreen.styles";

type Props = NativeStackScreenProps<RootStackParamList, "Reading Plan">;

const getZeroBasedIsoWeekDay = (date: Date) => (date.getDay() + 6) % 7;
const getIsoWeekDay = (date: Date) => getZeroBasedIsoWeekDay(date) + 1;

function weekDateToDate(year: number, week: number, weekDay: number) {
  const zeroBasedWeek = week - 1;
  const zeroBasedWeekDay = weekDay - 1;
  let days = zeroBasedWeek * 7 + zeroBasedWeekDay;

  // Dates start at 2017-01-01 and not 2017-01-00
  days += 1;

  const firstDayOfYear = new Date(year, 0, 1);
  const firstIsoWeekDay = getIsoWeekDay(firstDayOfYear);
  const zeroBasedFirstIsoWeekDay = getZeroBasedIsoWeekDay(firstDayOfYear);

  // If year begins with W52 or W53
  if (firstIsoWeekDay > 4) days += 8 - firstIsoWeekDay;
  // Else begins with W01
  else days -= zeroBasedFirstIsoWeekDay;

  const result = new Date(year, 0, days);
  return `${result.toLocaleDateString().split("/").slice(0, 2).join("/")}`;
}

export const ReadingPlanScreen: React.FunctionComponent<Props> = ({
  navigation,
}: Props) => {
  // Custom hooks
  const dispatch = useDispatch();
  const readingPlan = useAppSelector(selectReadingPlan);
  const readingPlanProgress = useAppSelector(selectReadingPlanProgressState);
  const theme = useTheme();

  // State hooks
  const [listData, setListData] = useState<Array<{ title: string; data: any }>>(
    []
  );

  // Callback hooks

  // Effect hooks
  React.useEffect(() => {
    dispatch(getReadingPlan());
    dispatch(getReadingPlanProgressState());
  }, [dispatch]);

  useEffect(() => {
    if (readingPlan) {
      const data = readingPlan.weeks.map(
        (week: ReadingPlanWeek, weekIndex: number) => ({
          title: `Week ${weekIndex + 1} - ${weekDateToDate(
            2021,
            weekIndex + 1,
            1
          )}`,
          data: week.days.map((day: ReadingPlanDay, dayIndex) => ({
            ...day,
            weekIndex,
            isComplete:
              readingPlanProgress?.weeks[weekIndex].days[dayIndex].isCompleted,
          })),
        })
      );
      setListData(data);
    }
  }, [readingPlan, readingPlanProgress]);

  // Event handlers
  const handleCompleteDay = (
    weekIndex: number,
    dayIndex: number,
    isComplete: boolean
  ) => {
    if (isComplete) {
      // eslint-disable-next-line no-void
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // eslint-disable-next-line no-void
      void Haptics.selectionAsync();
    }
    if (readingPlanProgress) {
      const tempPlan: ReadingPlanProgressState = JSON.parse(
        JSON.stringify(readingPlanProgress)
      ) as ReadingPlanProgressState;
      tempPlan.weeks[weekIndex].days[dayIndex].isCompleted = isComplete;
      dispatch(storeReadingPlanProgressState(tempPlan));
    }
  };

  // Constants
  const themedStyles = styles({ theme });

  return (
    <SafeAreaView
      edges={["left", "bottom", "right"]}
      style={themedStyles.screen}
    >
      <SectionList
        sections={listData}
        style={themedStyles.planList}
        keyExtractor={(item: ReadingPlanDay, index) =>
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `${item.studies ?? 0}${index}`
        }
        renderItem={({ item, index }) => (
          <>
            <View style={themedStyles.planItem}>
              {item.isComplete ? (
                <Ionicons
                  name="checkmark-circle"
                  size={36}
                  color={colors.green}
                  style={themedStyles.planItemCheckbox}
                  onPress={() =>
                    handleCompleteDay(item.weekIndex ?? 0, index, false)
                  }
                />
              ) : (
                <Ionicons
                  name="ellipse-outline"
                  size={36}
                  color={theme.colors.border}
                  style={themedStyles.planItemCheckbox}
                  onPress={() =>
                    handleCompleteDay(item.weekIndex ?? 0, index, true)
                  }
                />
              )}
              <View style={themedStyles.planItemContent}>
                <Text style={themedStyles.dayLabel}>Day {index + 1}</Text>
                <View style={themedStyles.planItemReading}>
                  <View style={themedStyles.planItemReadingColumn}>
                    <Text style={themedStyles.planItemTitle}>Studies</Text>
                    {item.studies.map((study) => (
                      <Text key={study} style={themedStyles.planItemVerses}>
                        {study}
                      </Text>
                    ))}
                  </View>
                  <View style={themedStyles.planItemReadingColumn}>
                    <Text style={themedStyles.planItemTitle}>Reflections</Text>
                    {item.reflections.map((reflection) => (
                      <Text
                        key={reflection}
                        style={themedStyles.planItemVerses}
                      >
                        {reflection}
                      </Text>
                    ))}
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
          </>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={themedStyles.sectionHeaderText}>{title}</Text>
        )}
      />
    </SafeAreaView>
  );
};
