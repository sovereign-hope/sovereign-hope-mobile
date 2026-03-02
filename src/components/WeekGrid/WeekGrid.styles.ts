import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { radius, spacing } from "src/style/layout";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { body, header3 } from "src/style/typography";

type Props = {
  theme: Theme;
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

export const styles = ({ theme }: Props): Style =>
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
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
    },
    dayCardCompact: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.lmedium,
      borderRadius: radius.large,
      backgroundColor: theme.colors.card,
    },
    dayCardToday: {
      borderWidth: 2,
      borderColor: colors.accent,
    },
    dayCardSelected: {
      backgroundColor: theme.dark
        ? "rgba(186, 135, 72, 0.2)"
        : "rgba(186, 135, 72, 0.1)",
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
      color: theme.dark ? colors.white : colors.darkGrey,
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
