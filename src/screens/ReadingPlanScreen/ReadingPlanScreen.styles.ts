import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { spacing, elementSize, radius } from "src/style/layout";
import { header1, header2, header3 } from "src/style/typography";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";

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
      // flex: 1,
    },
    planItem: {
      flexDirection: "row",
      padding: spacing.medium,
      alignItems: "center",
    },
    planItemContent: {
      flexDirection: "column",
      flex: 1,
    },
    planItemReading: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    planItemReadingColumn: {
      flexDirection: "column",
      padding: spacing.medium,
      flexShrink: 1,
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
      color: colors.accent,
      // backgroundColor: colors.accent,
      marginHorizontal: spacing.medium,
      marginTop: spacing.small,
      borderRadius: radius.large,
    },
  });
