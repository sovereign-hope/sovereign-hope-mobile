import { StyleSheet, ViewStyle, TextStyle } from "react-native";
import { spacing, radius } from "src/style/layout";
import { header2, header3 } from "src/style/typography";
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
  sectionHeaderContainer: ViewStyle;
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
    sectionHeaderContainer: {
      backgroundColor: theme.colors.background,
      zIndex: 1,
      elevation: 1,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
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
