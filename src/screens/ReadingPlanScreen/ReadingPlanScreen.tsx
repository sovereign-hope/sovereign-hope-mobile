import React, { useEffect, useRef, useState } from "react";
import { Button, Pressable, SectionList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector } from "src/hooks/store";
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTheme } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import {
  selectReadingPlan,
  ReadingPlanWeek,
  ReadingPlanDay,
  selectReadingPlanProgressState,
  storeReadingPlanProgressState,
  getReadingPlanProgressState,
  ReadingPlanProgressState,
} from "src/redux/readingPlanSlice";
import { colors } from "src/style/colors";
import { getWeekNumber, weekDateToDate } from "src/app/utils";
import { styles } from "./ReadingPlanScreen.styles";

type Props = NativeStackScreenProps<RootStackParamList, "Reading Plan">;

const ReadingPlanListItem: React.FunctionComponent<{
  item: ReadingPlanDay;
  index: number;
  navigation: NativeStackNavigationProp<RootStackParamList, "Reading Plan">;
}> = ({
  item,
  index,
  navigation,
}: {
  item: ReadingPlanDay;
  index: number;
  navigation: NativeStackNavigationProp<RootStackParamList, "Reading Plan">;
}) => {
  // Custom hooks
  const theme = useTheme();
  const dispatch = useDispatch();
  const readingPlanProgress = useAppSelector(selectReadingPlanProgressState);

  // Constants
  const themedStyles = styles({ theme });

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
      const tempPlan: ReadingPlanProgressState = JSON.parse(
        JSON.stringify(readingPlanProgress)
      ) as ReadingPlanProgressState;
      tempPlan.weeks[item.weekIndex ?? 0].days[index].isCompleted = isComplete;
      dispatch(storeReadingPlanProgressState(tempPlan));
    }
  };

  const handleRowPress = () => {
    const studyPassages = item.studies.map((study) => {
      const splitPassage = study.split(" ");
      const firstToken = splitPassage[0];
      const secondToken = splitPassage[1];
      const book =
        splitPassage.length > 2 ? `${firstToken}${secondToken}` : firstToken;
      const startChapter: number = Number.parseInt(
        splitPassage.length > 2 ? splitPassage[2] : firstToken,
        10
      );
      const endChapter: number = startChapter;
      return { book, startChapter, endChapter };
    });
    const reflectionPassages = item.reflections.map((reflection) => {
      const splitPassage = reflection.split(" ");
      const firstToken = splitPassage[0];
      const secondToken = splitPassage[1];
      const book =
        splitPassage.length > 2 ? `${firstToken}${secondToken}` : firstToken;
      const startChapter: number = Number.parseInt(
        splitPassage.length > 2 ? splitPassage[2] : secondToken,
        10
      );
      const endChapter: number = startChapter;
      return { book, startChapter, endChapter };
    });
    navigation.navigate("Read", {
      passages: studyPassages?.concat(reflectionPassages ?? []) ?? [],
      onComplete: () => handleCompleteDay(true),
    });
  };

  return (
    <Pressable onPress={handleRowPress}>
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
                <Text key={reflection} style={themedStyles.planItemVerses}>
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
    </Pressable>
  );
};

export const ReadingPlanScreen: React.FunctionComponent<Props> = ({
  navigation,
}: Props) => {
  // Custom hooks
  const dispatch = useDispatch();
  const readingPlan = useAppSelector(selectReadingPlan);
  const readingPlanProgress = useAppSelector(selectReadingPlanProgressState);
  const theme = useTheme();

  // Ref Hooks
  const scrollViewRef = useRef<SectionList<ReadingPlanDay>>(null);

  // State hooks
  const [listData, setListData] = useState<Array<{ title: string; data: any }>>(
    []
  );
  const [hasInitializedPosition, setHasInitializedPosition] = useState(false);

  // Callback hooks

  // Effect hooks
  React.useEffect(() => {
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

  useEffect(() => {
    if (!hasInitializedPosition) {
      const currentWeek = getWeekNumber(new Date())[1];
      if (scrollViewRef.current && listData.length > 0) {
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToLocation({
              sectionIndex:
                currentWeek < listData.length
                  ? currentWeek - 1
                  : listData.length - 1,
              itemIndex: 0,
            });
            setHasInitializedPosition(true);
          }
        }, 1000);
      }
    }
  }, [scrollViewRef, listData]);

  React.useLayoutEffect(() => {
    const currentWeek = getWeekNumber(new Date())[1];
    navigation.setOptions({
      // eslint-disable-next-line react/display-name, react/require-default-props
      headerRight: ({ tintColor }: { tintColor?: string | undefined }) => (
        <Button
          title="Today"
          color={colors.accent}
          onPress={() => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollToLocation({
                sectionIndex:
                  currentWeek < listData.length
                    ? currentWeek - 1
                    : listData.length - 1,
                itemIndex: 0,
              });
            }
          }}
        />
      ),
    });
  }, [navigation, listData]);

  // Constants
  const themedStyles = styles({ theme });

  return (
    <SafeAreaView edges={["left", "right"]} style={themedStyles.screen}>
      <SectionList
        ref={scrollViewRef}
        sections={listData}
        style={themedStyles.planList}
        initialNumToRender={400}
        keyExtractor={(item: ReadingPlanDay, index) =>
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `${item.studies ?? 0}${index}`
        }
        renderItem={({ item, index }) => (
          <ReadingPlanListItem
            item={item}
            index={index}
            navigation={navigation}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={themedStyles.sectionHeaderText}>{title}</Text>
        )}
      />
    </SafeAreaView>
  );
};
