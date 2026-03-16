import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { radius, spacing } from "src/style/layout";
import { header3 } from "src/style/typography";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  contentContainer: ViewStyle;
  emptyContentContainer: ViewStyle;
  letterHeaderContainer: ViewStyle;
  letterHeaderText: TextStyle;
  row: ViewStyle;
  rowName: TextStyle;
  rowDivider: ViewStyle;
  alphabetSidebar: ViewStyle;
  centeredState: ViewStyle;
  stateText: TextStyle;
  retryButton: ViewStyle;
  retryButtonText: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      paddingHorizontal: spacing.large,
      paddingRight: spacing.extraLarge + spacing.large,
      paddingBottom: spacing.extraLarge,
    },
    emptyContentContainer: {
      flexGrow: 1,
    },
    letterHeaderContainer: {
      paddingTop: spacing.medium,
      paddingBottom: spacing.small,
      backgroundColor: theme.colors.background,
    },
    letterHeaderText: {
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.accent,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lmedium,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
      backgroundColor: theme.colors.card,
      borderRadius: radius.medium,
    },
    rowName: {
      ...header3,
      color: theme.colors.text,
      flex: 1,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginLeft: 72,
      marginBottom: spacing.small,
    },
    alphabetSidebar: {
      position: "absolute",
      right: spacing.small,
      top: spacing.medium,
      bottom: spacing.extraLarge,
      justifyContent: "center",
    },
    centeredState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.extraLarge,
    },
    stateText: {
      color: theme.colors.text,
      opacity: 0.8,
      textAlign: "center",
    },
    retryButton: {
      marginTop: spacing.large,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: colors.accent,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
    },
    retryButtonText: {
      color: colors.accent,
      fontWeight: "600",
    },
  });
