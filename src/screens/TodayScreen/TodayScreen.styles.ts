import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { spacing, elementSize } from "src/style/layout";
import { header1, header2, header3 } from "src/style/typography";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  scrollView: ViewStyle;
  title: TextStyle;
  dayContent: ViewStyle;
  dayTitle: TextStyle;
  dayTitleIcon: ImageStyle;
  dayReadingContainer: ViewStyle;
  dayReadingColumnPrimary: ViewStyle;
  dayReadingColumnSecondary: ViewStyle;
  dayReadingHeader: TextStyle;
  whiteText: TextStyle;
  memoryText: TextStyle;
  memoryQuestionHeader: TextStyle;
  memoryQuestionSubHeader: TextStyle;
  memoryQuestion: TextStyle;
  footer: ViewStyle;
  footerButton: ViewStyle;
  spacer: ViewStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.dark ? colors.darkGrey : colors.grey0,
    },
    scrollView: {
      backgroundColor: theme.dark ? colors.darkGrey : colors.grey0,
    },
    title: {
      ...header1,
      padding: spacing.large,
      color: theme.dark ? colors.white : colors.darkGrey,
      backgroundColor: theme.dark ? colors.darkGrey : colors.grey0,
    },
    dayContent: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    dayTitle: {
      flexDirection: "column",
    },
    dayTitleIcon: {
      fontSize: 32,
      marginRight: spacing.medium,
    },
    dayReadingContainer: {
      flexDirection: "row",
      marginBottom: spacing.large,
    },
    dayReadingColumnPrimary: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.darkGrey,
      padding: spacing.large,
      color: colors.white,
    },
    dayReadingColumnSecondary: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.large,
      backgroundColor: colors.darkGrey,
      // borderColor: colors.grey2,
      // borderTopWidth: 2,
      // borderBottomWidth: 2,
      // borderLeftWidth: 2,
    },
    dayReadingHeader: {
      ...header2,
      marginBottom: spacing.medium,
      color: colors.white,
    },
    whiteText: {
      color: colors.white,
    },
    memoryQuestionHeader: {
      ...header2,
      margin: spacing.medium,
      color: theme.colors.text,
    },
    memoryQuestionSubHeader: {
      fontWeight: "bold",
      marginHorizontal: spacing.large,
      marginVertical: spacing.small,
      color: theme.colors.text,
    },
    memoryQuestion: {
      marginVertical: spacing.small,
      marginHorizontal: spacing.large,
      color: theme.colors.text,
    },
    memoryText: {
      color: colors.white,
    },
    footer: {
      padding: spacing.medium,
      justifyContent: "flex-end",
      backgroundColor: theme.colors.background,
    },
    footerButton: {
      marginBottom: spacing.medium,
    },
    spacer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  });
