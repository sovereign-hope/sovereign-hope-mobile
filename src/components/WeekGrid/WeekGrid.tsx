import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "src/style/colors";
import { ReadingPlanDay } from "src/redux/readingPlanSlice";
import { styles } from "./WeekGrid.styles";

const WEEKDAY_MAP = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface WeekGridProps {
  days: ReadingPlanDay[];
  currentDayIndex: number;
  onDayPress: (dayIndex: number) => void;
  onToggleComplete: (isComplete: boolean, dayIndex: number) => void;
  selectedDayIndex?: number;
  compact?: boolean;
}

const getDayLabel = (index: number, currentDayIndex: number): string => {
  if (currentDayIndex === index) return "Today";
  if (currentDayIndex === index - 1) return "Tomorrow";
  if (currentDayIndex === index + 1) return "Yesterday";
  return WEEKDAY_MAP[index];
};

export const WeekGrid: React.FunctionComponent<WeekGridProps> = ({
  days,
  currentDayIndex,
  onDayPress,
  onToggleComplete,
  selectedDayIndex,
  compact = false,
}: WeekGridProps) => {
  const theme = useTheme();
  const themedStyles = styles({ theme });

  if (compact) {
    return (
      <View style={themedStyles.compactGrid}>
        {days.map((day, index) => {
          if (day.reading.length === 0 || day.reading[0] === "") {
            // eslint-disable-next-line unicorn/no-null
            return null;
          }

          const isToday = currentDayIndex === index;
          const isSelected = selectedDayIndex === index;

          return (
            <Pressable
              key={day.reading.join("")}
              onPress={() => onDayPress(index)}
              accessibilityRole="button"
              style={({ pressed }) => [
                themedStyles.dayCardCompact,
                isToday && themedStyles.dayCardToday,
                isSelected && themedStyles.dayCardSelected,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Pressable
                onPress={() => onToggleComplete(!day.isComplete, index)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: day.isComplete }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                {day.isComplete ? (
                  <Animated.View
                    entering={FadeIn.duration(250)}
                    exiting={FadeOut.duration(250)}
                  >
                    <Ionicons name="checkbox" size={28} color={colors.green} />
                  </Animated.View>
                ) : (
                  <Ionicons
                    name="square-outline"
                    size={28}
                    color={theme.colors.border}
                  />
                )}
              </Pressable>
              <View style={themedStyles.cardContent}>
                <Text style={themedStyles.dayLabel}>
                  {getDayLabel(index, currentDayIndex)}
                </Text>
                {day.reading.map((reading) => (
                  <Text
                    style={themedStyles.readingText}
                    key={reading}
                    numberOfLines={1}
                  >
                    {reading}
                  </Text>
                ))}
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.border}
                style={themedStyles.chevron}
              />
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={themedStyles.grid}
    >
      {days.map((day, index) => {
        if (day.reading.length === 0 || day.reading[0] === "") {
          // eslint-disable-next-line unicorn/no-null
          return null;
        }

        const isToday = currentDayIndex === index;

        return (
          <Pressable
            key={day.reading.join("")}
            onPress={() => onDayPress(index)}
            accessibilityRole="button"
            style={({ pressed }) => [
              themedStyles.dayCard,
              isToday && themedStyles.dayCardToday,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={themedStyles.cardRow}>
              <Pressable
                onPress={() => onToggleComplete(!day.isComplete, index)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: day.isComplete }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                {day.isComplete ? (
                  <Animated.View
                    entering={FadeIn.duration(250)}
                    exiting={FadeOut.duration(250)}
                  >
                    <Ionicons name="checkbox" size={28} color={colors.green} />
                  </Animated.View>
                ) : (
                  <Ionicons
                    name="square-outline"
                    size={28}
                    color={theme.colors.border}
                  />
                )}
              </Pressable>
              <Text
                style={[
                  themedStyles.dayLabel,
                  { marginBottom: 0, marginLeft: 8 },
                ]}
                numberOfLines={1}
              >
                {getDayLabel(index, currentDayIndex)}
              </Text>
            </View>
            {day.reading.map((reading) => (
              <Text
                style={themedStyles.readingText}
                key={reading}
                numberOfLines={2}
              >
                {reading}
              </Text>
            ))}
          </Pressable>
        );
      })}
    </ScrollView>
  );
};
