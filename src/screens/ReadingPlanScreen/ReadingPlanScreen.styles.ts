import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { spacing, elementSize } from "src/style/layout";
import { header1, header2, header3 } from "src/style/typography";
import { Theme } from "@react-navigation/native";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  planList: ViewStyle;
  planItem: ViewStyle;
  planItemContent: ViewStyle;
  planItemReading: ViewStyle;
  planItemReadingColumn: ViewStyle;
  planItemCheckbox: ViewStyle;
  planItemTitle: TextStyle;
  planItemVerses: TextStyle;
  sectionHeaderText: TextStyle;
  dayLabel: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      paddingTop: 0,
      backgroundColor: theme.colors.background,
    },
    planList: {
      width: "100%",
      flex: 1,
    },
    planItem: {
      flexDirection: "row",
      padding: spacing.medium,
      alignItems: "center",
      backgroundColor: theme.colors.card,
    },
    planItemContent: {
      flexDirection: "column",
      flex: 1,
    },
    planItemReading: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    planItemReadingColumn: {
      flexDirection: "column",
      padding: spacing.medium,
    },
    planItemCheckbox: {
      margin: spacing.small,
    },
    planItemTitle: {
      ...header2,
      color: theme.colors.text,
    },
    planItemVerses: {
      color: theme.colors.text,
    },
    sectionHeaderText: {
      ...header1,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      padding: spacing.medium,
    },
    dayLabel: {
      ...header2,
      color: theme.colors.text,
    },
  });
