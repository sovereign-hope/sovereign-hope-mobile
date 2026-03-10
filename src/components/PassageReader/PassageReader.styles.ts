import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { elementSize, radius, spacing } from "src/style/layout";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { header2, header3 } from "src/style/typography";

type Props = {
  theme: Theme;
  isEinkMode?: boolean;
};

interface Style {
  container: ViewStyle;
  closeButtonRow: ViewStyle;
  title: TextStyle;
  spacer: ViewStyle;
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

export const styles = ({ theme, isEinkMode = false }: Props): Style =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: spacing.large,
    },
    closeButtonRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingTop: spacing.small,
    },
    title: {
      ...header2,
      color: theme.colors.text,
      marginTop: spacing.large,
    },
    spacer: {
      flex: 1,
    },
    memoryButton: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.medium,
      backgroundColor: isEinkMode ? theme.colors.background : colors.red,
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: isEinkMode ? theme.colors.primary : "transparent",
      borderRadius: radius.large,
      marginBottom: spacing.medium,
    },
    memoryButtonText: {
      color: isEinkMode ? theme.colors.primary : colors.white,
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
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: theme.colors.border,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: isEinkMode ? 0 : 0.1,
    },
    contentCardColumn: {
      flex: 1,
      flexDirection: "column",
      color: theme.colors.text,
    },
    contentCardRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    contentCardHeader: {
      ...header3,
      color: theme.colors.text,
      marginBottom: spacing.medium,
    },
    studyQuestionHeader: {
      ...header2,
      color: isEinkMode ? theme.colors.primary : colors.accent,
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
