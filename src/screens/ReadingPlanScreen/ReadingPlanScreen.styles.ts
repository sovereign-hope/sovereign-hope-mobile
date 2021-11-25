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
    },
    planItemContent: {
      flexDirection: "row",
      flex: 1,
      alignItems: "center",
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
      color: theme.colors.text,
      fontWeight: "bold",
    },
    planItemVerses: {
      color: theme.colors.text,
    },
    sectionHeaderText: {
      ...header2,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      padding: spacing.medium,
    },
    dayLabel: {
      ...header3,
      color: theme.colors.text,
      margin: spacing.medium,
    },
  });
