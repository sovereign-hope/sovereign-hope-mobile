import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
  selectReadingPlanProgressState,
} from "src/redux/readingPlanSlice";
import { styles } from "./WeekendView.styles";
import { ReadingPlanListItem } from "../../ReadingPlanScreen/ReadingPlanScreen";
import { getWeekNumber } from "src/app/utils";

interface ReviewListProps {
  listData: Array<ReadingPlanDay>;
  onRowPress: (
    item: ReadingPlanDay,
    onCompleteDay: (isComplete: boolean) => void
  ) => void;
}

const ReviewList: React.FunctionComponent<ReviewListProps> = ({
  listData,
  onRowPress,
}: ReviewListProps) => {
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: animation }}>
      {listData.map((item: ReadingPlanDay, index: number) => (
        <ReadingPlanListItem
          item={item}
          key={item.reading.toString() ?? 0}
          index={index}
          handleRowPress={onRowPress}
        />
      ))}
    </Animated.View>
  );
};

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
  const readingPlanWeekProgress = useAppSelector(
    selectWeeklyReadingPlanProgress
  );
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
    const listener = AppState.addEventListener("change", handler);

    return () => {
      listener.remove();
    };
  }, []);

  useEffect(() => {
    if (readingPlanWeek) {
      const currentWeekIndex = getWeekNumber(new Date()).week - 1;
      const data = readingPlanWeek.days.map(
        (day: ReadingPlanDay, dayIndex) => ({
          ...day,
          weekIndex: currentWeekIndex,
          isComplete: readingPlanWeekProgress[dayIndex],
        })
      );
      setListData(data);
    }
  }, [readingPlanWeek, readingPlanWeekProgress]);

  React.useEffect(() => {
    dispatch(getReadingPlan());
    dispatch(getReadingPlanProgressState());
  }, [dispatch]);

  // Event handlers

  // Constants
  const themedStyles = styles({ theme });
  const shouldShowLoadingIndicator = listData.length === 0;

  return (
    <View style={themedStyles.content}>
      <View style={themedStyles.header}>
        <Ionicons
          name="play-back"
          style={themedStyles.headerIcon}
          color={theme.colors.text}
        />
        <Text style={themedStyles.title}>Weekly Review</Text>
      </View>
      {shouldShowLoadingIndicator ? (
        <View style={themedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text} />
        </View>
      ) : (
        <ReviewList listData={listData} onRowPress={onRowPress} />
      )}
      <View style={themedStyles.spacer} />
    </View>
  );
};
