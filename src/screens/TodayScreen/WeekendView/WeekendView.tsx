import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  AppStateStatus,
  Text,
  View,
} from "react-native";
import { useAppSelector, useAppDispatch } from "src/hooks/store";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  getReadingPlan,
  getReadingPlanProgressState,
  ReadingPlanDay,
  selectWeekReadingPlan,
} from "src/redux/readingPlanSlice";
import { styles } from "./WeekendView.styles";
import {
  ReadingPlanListItem,
  ReadingPlanListItemData,
} from "../../ReadingPlanScreen/ReadingPlanScreen";
import { getDayOfYearIndices } from "src/app/utils";

interface ReviewListProps {
  listData: Array<ReadingPlanListItemData>;
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
  }, [animation]);

  return (
    <Animated.View style={{ opacity: animation }}>
      {listData.map((item: ReadingPlanListItemData) => (
        <ReadingPlanListItem
          item={item}
          key={`${item.weekIndex}-${item.originalDayIndex}`}
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
  const dispatch = useAppDispatch();
  const readingPlanWeek = useAppSelector(selectWeekReadingPlan);
  const theme = useTheme();

  // Ref Hooks
  const appState = useRef(AppState.currentState);

  // State hooks
  const [listData, setListData] = useState<Array<ReadingPlanListItemData>>([]);

  // Callback hooks

  // Effect hooks
  useEffect(() => {
    const handler = (nextAppState: AppStateStatus) => {
      if (
        /inactive|background/.test(appState.current) &&
        nextAppState === "active"
      ) {
        void dispatch(getReadingPlan());
        void dispatch(getReadingPlanProgressState());
      }
      appState.current = nextAppState;
    };
    const listener = AppState.addEventListener("change", handler);

    return () => {
      listener.remove();
    };
  }, [dispatch]);

  // Build list data only when reading plan changes (not on progress updates)
  // Progress/completion state is computed in each list item via Redux selector
  useEffect(() => {
    if (readingPlanWeek) {
      const { weekIndex } = getDayOfYearIndices(new Date());
      // Filter to only non-empty days and add required display metadata
      const data = readingPlanWeek.days
        .map((day: ReadingPlanDay, dayIndex) => {
          const hasContent = day.reading.length > 0 && day.reading[0] !== "";
          if (!hasContent) return;

          return {
            ...day,
            weekIndex,
            originalDayIndex: dayIndex,
          };
        })
        .filter(Boolean)
        .map((day, filteredIndex) => ({
          ...day,
          displayDayNumber: filteredIndex + 1,
        })) as ReadingPlanListItemData[];
      setListData(data);
    }
  }, [readingPlanWeek]);

  React.useEffect(() => {
    void dispatch(getReadingPlan());
    void dispatch(getReadingPlanProgressState());
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
