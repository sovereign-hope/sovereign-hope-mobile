import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { radius, spacing } from "src/style/layout";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { header2, header3 } from "src/style/typography";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  container: ViewStyle;
  title: TextStyle;
  footer: ViewStyle;
  spacer: ViewStyle;
  button: ViewStyle;
  memoryButton: ViewStyle;
  memoryButtonText: TextStyle;
  memoryButtonIcon: TextStyle;
  contentCard: ViewStyle;
  contentCardColumn: ViewStyle;
  contentCardRow: ViewStyle;
  contentCardHeader: TextStyle;
  studyQuestionHeader: TextStyle;
  studyQuestionSubHeader: TextStyle;
  studyQuestion: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: theme.colors.background,
    },
    container: {
      paddingHorizontal: spacing.large,
    },
    title: {
      ...header2,
      color: theme.colors.text,
      marginTop: spacing.large,
    },
    footer: {
      marginHorizontal: spacing.small,
      marginBottom: spacing.small,
      justifyContent: "flex-end",
    },
    spacer: {
      flex: 1,
    },
    button: {
      marginBottom: spacing.medium,
    },
    memoryButton: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.medium,
      backgroundColor: colors.red,
      borderRadius: radius.large,
      marginBottom: spacing.medium,
    },
    memoryButtonText: {
      color: colors.white,
    },
    memoryButtonIcon: {
      fontSize: 32,
      marginRight: spacing.medium,
    },
    contentCard: {
      flexShrink: 1,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.large,
      padding: spacing.lmedium,
      borderRadius: radius.large,
      backgroundColor: theme.colors.card,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
    },
    contentCardColumn: {
      flex: 1,
      flexDirection: "column",
      color: theme.dark ? colors.white : colors.darkGrey,
    },
    contentCardRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    contentCardHeader: {
      ...header3,
      color: theme.dark ? colors.white : colors.darkGrey,
      marginBottom: spacing.medium,
    },
    studyQuestionHeader: {
      ...header2,
      color: colors.accent,
    },
    studyQuestionSubHeader: {
      fontWeight: "bold",
      marginVertical: spacing.small,
      color: theme.colors.text,
    },
    studyQuestion: {
      marginVertical: spacing.small,
      color: theme.colors.text,
    },
  });
