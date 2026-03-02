import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { spacing } from "src/style/layout";
import { header2 } from "src/style/typography";
import { Theme } from "@react-navigation/native";

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
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flexGrow: 1,
      marginVertical: spacing.extraExtraLarge,
    },
    header: {
      flexDirection: "row",
      backgroundColor: theme.colors.background,
    },
    headerIcon: {
      fontSize: 24,
      marginVertical: spacing.large,
      marginLeft: spacing.large,
    },
    title: {
      ...header2,
      padding: spacing.large,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      backgroundColor: theme.colors.background,
      marginBottom: spacing.large,
    },
    bodyText: {
      color: theme.colors.text,
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
      color: theme.colors.text,
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
      color: theme.colors.text,
    },
    spacer: {
      flex: 1,
    },
  });
