import React, { useEffect, useRef } from "react";
import { AppState, AppStateStatus, ScrollView, Text, View } from "react-native";
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
  selectDailyReadingPlanProgress,
  storeReadingPlanProgressState,
  getReadingPlanProgressState,
  ReadingPlanProgressState,
  selectDailyReadingPlan,
  selectReadingPlanProgressState,
} from "src/redux/readingPlanSlice";
import { colors } from "src/style/colors";
import { FlatButton } from "src/components";
import { getDayInWeek, getWeekNumber, parsePassageString } from "src/app/utils";
import { spacing } from "src/style/layout";
import { styles } from "./TodayScreen.styles";

type Props = NativeStackScreenProps<RootStackParamList, "Today">;

export const TodayScreen: React.FunctionComponent<Props> = ({
  navigation,
}: Props) => {
  // Custom hooks
  const dispatch = useDispatch();
  const readingPlanDay = useAppSelector(selectDailyReadingPlan);
  const readingPlanDayProgress = useAppSelector(selectDailyReadingPlanProgress);
  const readingPlanProgress = useAppSelector(selectReadingPlanProgressState);
  const theme = useTheme();

  // Ref Hooks
  const appState = useRef(AppState.currentState);

  // Callback hooks

  // Effect hooks
  useEffect(() => {
    const handler = (nextAppState: AppStateStatus) => {
      if (
        /inactive|background/.test(appState.current) &&
        nextAppState === "active"
      ) {
        dispatch(getReadingPlan());
        dispatch(getReadingPlanProgressState());
      }
      appState.current = nextAppState;
    };
    AppState.addEventListener("change", handler);

    return () => {
      AppState.removeEventListener("change", handler);
    };
  }, []);

  React.useEffect(() => {
    dispatch(getReadingPlan());
    dispatch(getReadingPlanProgressState());
  }, [dispatch]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: undefined,
    });
  }, [navigation]);

  // Event handlers
  const handleCompleteDay = (isComplete: boolean) => {
    if (isComplete) {
      // eslint-disable-next-line no-void
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // eslint-disable-next-line no-void
      void Haptics.selectionAsync();
    }
    if (readingPlanProgress) {
      const currentWeekIndex = getWeekNumber(new Date()).week - 1;
      const currentDayIndex = getDayInWeek() - 1;
      const isEndOfWeek = currentDayIndex > 4;

      const tempPlan: ReadingPlanProgressState = JSON.parse(
        JSON.stringify(readingPlanProgress)
      ) as ReadingPlanProgressState;
      tempPlan.weeks[currentWeekIndex].days[
        isEndOfWeek ? 4 : currentDayIndex
      ].isCompleted = isComplete;
      dispatch(storeReadingPlanProgressState(tempPlan));
    }
  };

  const handleReadPress = () => {
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
        onComplete: () => handleCompleteDay(true),
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
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "long",
    day: "numeric",
  };
  const date = new Date();
  const formatedDate = date.toLocaleDateString("en-US", dateOptions);

  return (
    <SafeAreaView style={themedStyles.screen} edges={["left", "top", "right"]}>
      <ScrollView
        style={themedStyles.scrollView}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Text style={themedStyles.title}>{formatedDate}</Text>
        <View style={themedStyles.dayContent}>
          <View style={themedStyles.dayReadingContainer}>
            <View style={themedStyles.dayReadingColumnPrimary}>
              <Ionicons
                name="document-text"
                color={colors.white}
                style={themedStyles.dayTitleIcon}
              />
              <View style={themedStyles.dayTitle}>
                <Text
                  style={{
                    ...themedStyles.dayReadingHeader,
                    ...themedStyles.whiteText,
                  }}
                >
                  Reading
                </Text>
                {readingPlanDay?.reading.map((reading) => (
                  <Text key={reading} style={themedStyles.whiteText}>
                    {reading}
                  </Text>
                ))}
              </View>
            </View>
            <View style={themedStyles.dayReadingColumnSecondary}>
              <Ionicons
                name="heart-half"
                color={colors.white}
                style={themedStyles.dayTitleIcon}
              />
              <View style={themedStyles.dayTitle}>
                <Text style={themedStyles.dayReadingHeader}>Memory</Text>
                <Text
                  key={readingPlanDay?.memory.passage}
                  style={themedStyles.memoryText}
                >
                  {readingPlanDay?.memory.passage}
                </Text>
                <View style={themedStyles.spacer} />
              </View>
            </View>
          </View>
          <Text style={themedStyles.memoryQuestionHeader}>
            Questions for Study
          </Text>
          <Text style={themedStyles.memoryQuestionSubHeader}>Look Up</Text>
          <Text style={themedStyles.memoryQuestion}>
            What does this passage teach us about the Triune God, his character,
            and his plan to save us in the gospel?
          </Text>
          <Text style={themedStyles.memoryQuestionSubHeader}>Look In</Text>
          <Text style={themedStyles.memoryQuestion}>
            What does this passage teach us about our own hearts and lives, and
            the world we live in?
          </Text>
          <Text style={themedStyles.memoryQuestionSubHeader}>Look Out</Text>
          <Text style={themedStyles.memoryQuestion}>
            How does this passage influence the way we should act and think as
            Christians at home, at work, in relationships or as the church?
          </Text>

          <Text style={themedStyles.memoryQuestionHeader}>
            Thoughts for Reflection
          </Text>
          <Text style={themedStyles.memoryQuestion}>
            Write down one way this passage can influence our emotions and
            prayer life and be sure to set aside time to pray for that today.
          </Text>
          <View style={themedStyles.spacer} />
        </View>
        <View style={themedStyles.footer}>
          <View style={themedStyles.footerRow}>
            <FlatButton
              title="Read"
              onPress={handleReadPress}
              style={{
                ...themedStyles.footerButton,
                marginRight: spacing.medium,
                backgroundColor: colors.blue,
              }}
            />
            <FlatButton
              title="Memorize"
              onPress={handlePracticePress}
              style={{
                ...themedStyles.footerButton,
                backgroundColor: colors.blue,
              }}
            />
          </View>
          <FlatButton
            title={
              readingPlanDayProgress ? "Day completed!" : "Mark as complete"
            }
            onPress={() => handleCompleteDay(!readingPlanDayProgress)}
            style={{
              backgroundColor: readingPlanDayProgress
                ? colors.green
                : colors.accent,
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
