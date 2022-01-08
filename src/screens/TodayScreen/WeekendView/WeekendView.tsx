import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Text,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import { useAppSelector } from "src/hooks/store";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  getReadingPlan,
  getReadingPlanProgressState,
  ReadingPlanDay,
  selectWeekReadingPlan,
  selectWeeklyReadingPlanProgress,
  selectIsLoading,
} from "src/redux/readingPlanSlice";
import { colors } from "src/style/colors";
import { styles } from "./WeekendView.styles";
import { ReadingPlanListItem } from "../../ReadingPlanScreen/ReadingPlanScreen";

interface Props {
  onRowPress: (
    item: ReadingPlanDay,
    onCompleteDay: (isComplete: boolean) => void
  ) => void;
}

export const WeekendView: React.FunctionComponent<Props> = ({
  onRowPress,
}: Props) => {
  // Custom hooks
  const dispatch = useDispatch();
  const readingPlanWeek = useAppSelector(selectWeekReadingPlan);
  const readlingPlanWeekProgress = useAppSelector(
    selectWeeklyReadingPlanProgress
  );
  const isLoading = useAppSelector(selectIsLoading);
  const theme = useTheme();

  // Ref Hooks
  const appState = useRef(AppState.currentState);

  // State hooks
  const [listData, setListData] = useState<Array<ReadingPlanDay>>([]);

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

  useEffect(() => {
    if (readingPlanWeek) {
      const data = readingPlanWeek.days.map(
        (day: ReadingPlanDay, dayIndex) => ({
          ...day,
          isComplete: readlingPlanWeekProgress[dayIndex],
        })
      );
      setListData(data);
    }
  }, [readingPlanWeek, readlingPlanWeekProgress]);

  React.useEffect(() => {
    dispatch(getReadingPlan());
    dispatch(getReadingPlanProgressState());
  }, [dispatch]);

  // Event handlers

  // Constants
  const themedStyles = styles({ theme });
  const shouldShowLoadingIndicator = isLoading && readingPlanWeek === undefined;

  return (
    <View style={themedStyles.content}>
      <View style={themedStyles.header}>
        <Ionicons
          name="play-back"
          color={colors.white}
          style={themedStyles.headerIcon}
        />
        <Text style={themedStyles.title}>Weekly Review</Text>
      </View>
      {shouldShowLoadingIndicator ? (
        <View style={themedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text} />
        </View>
      ) : (
        listData.map((item: ReadingPlanDay, index: number) => (
          <ReadingPlanListItem
            item={item}
            key={item.reading.toString() ?? 0}
            index={index}
            handleRowPress={onRowPress}
          />
        ))
      )}
      <View style={themedStyles.spacer} />
    </View>
  );
};
