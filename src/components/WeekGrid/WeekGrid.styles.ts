import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { radius, spacing } from "src/style/layout";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { body, header3 } from "src/style/typography";

type Props = {
  theme: Theme;
  isEinkMode?: boolean;
};

interface Style {
  grid: ViewStyle;
  compactGrid: ViewStyle;
  dayCard: ViewStyle;
  dayCardCompact: ViewStyle;
  dayCardToday: ViewStyle;
  dayCardSelected: ViewStyle;
  checkboxContainer: ViewStyle;
  cardContent: ViewStyle;
  dayLabel: TextStyle;
  readingText: TextStyle;
  chevron: ViewStyle;
  cardRow: ViewStyle;
}

export const styles = ({ theme, isEinkMode = false }: Props): Style =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      gap: spacing.medium,
      paddingHorizontal: spacing.large,
      marginBottom: spacing.large,
    },
    compactGrid: {
      flexDirection: "column",
      gap: spacing.medium,
      padding: spacing.medium,
    },
    dayCard: {
      flexDirection: "column",
      padding: spacing.lmedium,
      borderRadius: radius.large,
      backgroundColor: theme.colors.card,
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: theme.colors.border,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isEinkMode ? 0 : 0.1,
    },
    dayCardCompact: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.lmedium,
      borderRadius: radius.large,
      backgroundColor: theme.colors.card,
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: theme.colors.border,
    },
    dayCardToday: {
      borderWidth: 2,
      borderColor: isEinkMode ? theme.colors.primary : colors.accent,
    },
    dayCardSelected: {
      backgroundColor: isEinkMode
        ? theme.colors.card
        : theme.dark
        ? "rgba(186, 135, 72, 0.2)"
        : "rgba(186, 135, 72, 0.1)",
      borderWidth: isEinkMode ? 2 : 0,
      borderColor: isEinkMode ? theme.colors.primary : "transparent",
    },
    checkboxContainer: {
      marginBottom: spacing.small,
    },
    cardContent: {
      flex: 1,
      marginLeft: spacing.medium,
    },
    dayLabel: {
      ...header3,
      color: theme.colors.text,
      marginBottom: spacing.small,
    },
    readingText: {
      ...body,
      color: theme.colors.text,
    },
    chevron: {
      marginLeft: spacing.medium,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
    },
  });
