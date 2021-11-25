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
  title: TextStyle;
  dayContent: ViewStyle;
  dayReadingContainer: ViewStyle;
  dayReadingColumnPrimary: ViewStyle;
  dayReadingColumnSecondary: ViewStyle;
  dayReadingHeader: TextStyle;
  whiteText: TextStyle;
  reflectionText: TextStyle;
  reflectionQuestionHeader: TextStyle;
  reflectionQuestionSubHeader: TextStyle;
  reflectionQuestion: TextStyle;
  footer: ViewStyle;
  footerButton: ViewStyle;
  spacer: ViewStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    title: {
      ...header1,
      margin: spacing.large,
      color: theme.colors.text,
    },
    dayContent: {
      flex: 1,
    },
    dayReadingContainer: {
      flexDirection: "row",
      marginBottom: spacing.large,
    },
    dayReadingColumnPrimary: {
      flex: 1,
      backgroundColor: colors.red,
      padding: spacing.large,
      color: colors.white,
    },
    dayReadingColumnSecondary: {
      flex: 1,
      padding: spacing.large,
      borderColor: colors.red,
      borderTopWidth: 2,
      borderBottomWidth: 2,
      borderLeftWidth: 2,
    },
    dayReadingHeader: {
      ...header2,
      marginBottom: spacing.medium,
      color: theme.colors.text,
    },
    whiteText: {
      color: colors.white,
    },
    reflectionQuestionHeader: {
      ...header2,
      margin: spacing.medium,
      color: theme.colors.text,
    },
    reflectionQuestionSubHeader: {
      fontWeight: "bold",
      marginHorizontal: spacing.large,
      marginVertical: spacing.small,
      color: theme.colors.text,
    },
    reflectionQuestion: {
      marginVertical: spacing.small,
      marginHorizontal: spacing.large,
      color: theme.colors.text,
    },
    reflectionText: {
      color: theme.colors.text,
    },
    footer: {
      marginHorizontal: spacing.medium,
      marginBottom: spacing.medium,
      justifyContent: "flex-end",
    },
    footerButton: {
      marginBottom: spacing.medium,
    },
    spacer: {
      flex: 1,
    },
  });
