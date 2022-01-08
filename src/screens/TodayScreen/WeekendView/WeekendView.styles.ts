import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { spacing } from "src/style/layout";
import { header1, header2 } from "src/style/typography";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  scrollView: ViewStyle;
  loadingContainer: ViewStyle;
  header: ViewStyle;
  headerIcon: ImageStyle;
  title: TextStyle;
  content: ViewStyle;
  bodyText: TextStyle;
  memoryText: TextStyle;
  memoryQuestionHeader: TextStyle;
  memoryQuestionSubHeader: TextStyle;
  memoryQuestion: TextStyle;
  footer: ViewStyle;
  footerRow: ViewStyle;
  footerButton: ViewStyle;
  whiteText: TextStyle;
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
    loadingContainer: {
      flexGrow: 1,
      marginVertical: spacing.extraExtraLarge,
    },
    header: {
      flexDirection: "row",
      backgroundColor: theme.dark ? colors.darkGrey : colors.grey0,
    },
    headerIcon: {
      fontSize: 24,
      marginVertical: spacing.large,
      marginLeft: spacing.large,
    },
    title: {
      ...header2,
      padding: spacing.large,
      color: theme.dark ? colors.white : colors.darkGrey,
      backgroundColor: theme.dark ? colors.darkGrey : colors.grey0,
    },
    content: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    bodyText: {
      color: theme.dark ? colors.white : colors.darkGrey,
      padding: spacing.large,
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
    footerRow: {
      flex: 1,
      flexDirection: "row",
    },
    footerButton: {
      flex: 1,
      marginBottom: spacing.medium,
    },
    whiteText: {
      color: colors.white,
    },
    spacer: {
      flex: 1,
    },
  });
