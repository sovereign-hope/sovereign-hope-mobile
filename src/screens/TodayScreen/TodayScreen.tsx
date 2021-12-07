import React from "react";
import { ScrollView, Text, View } from "react-native";
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
import { getDayInWeek, getWeekNumber } from "src/app/utils";
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

  // Callback hooks

  // Effect hooks
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
      const currentWeekIndex = getWeekNumber(new Date())[1] - 1;
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
    const readingPassages = readingPlanDay?.reading.map((reading) => {
      const splitPassage = reading.split(" ");
      const firstToken = splitPassage[0];
      const secondToken = splitPassage[1];
      const book =
        splitPassage.length > 2 ? `${firstToken}${secondToken}` : firstToken;
      const startChapter: number = Number.parseInt(
        splitPassage.length > 2 ? splitPassage[2] : firstToken,
        10
      );
      const endChapter: number = startChapter;
      return { book, startChapter, endChapter, isMemory: false };
    });
    const memoryPassages = readingPlanDay?.memory.map((memory) => {
      const splitPassage = memory.split(" ");
      const firstToken = splitPassage[0];
      const secondToken = splitPassage[1];
      const book =
        splitPassage.length > 2 ? `${firstToken}${secondToken}` : firstToken;
      const startChapter: number = Number.parseInt(
        splitPassage.length > 2 ? splitPassage[2] : secondToken,
        10
      );
      const endChapter: number = startChapter;
      return { book, startChapter, endChapter, isMemory: true };
    });
    navigation.navigate("Read", {
      passages: readingPassages?.concat(memoryPassages ?? []) ?? [],
      onComplete: () => handleCompleteDay(true),
    });
  };

  // Constants
  const themedStyles = styles({ theme });
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
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
                {readingPlanDay?.memory.map((memory) => (
                  <Text key={memory} style={themedStyles.memoryText}>
                    {memory}
                  </Text>
                ))}
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
        </View>
        <View style={themedStyles.spacer} />
        <View style={themedStyles.footer}>
          <FlatButton
            title="Read"
            onPress={handleReadPress}
            style={themedStyles.footerButton}
          />
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
