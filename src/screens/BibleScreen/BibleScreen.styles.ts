import { StyleSheet } from "react-native";
import type { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { spacing, radius } from "src/style/layout";

interface StyleProps {
  theme: Theme;
  isEinkMode: boolean;
}

export const styles = ({ theme, isEinkMode }: StyleProps) => {
  const actionColor = isEinkMode
    ? theme.dark
      ? colors.white
      : colors.black
    : colors.accent;

  const disabledColor = theme.dark
    ? "rgba(255,255,255,0.3)"
    : "rgba(0,0,0,0.25)";

  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.large,
      backgroundColor: theme.colors.background,
    },
    errorText: {
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: spacing.medium,
    },
    retryButton: {
      paddingHorizontal: spacing.large,
      paddingVertical: spacing.small,
      borderRadius: radius.medium,
      backgroundColor: actionColor,
    },
    retryButtonText: {
      color: colors.white,
      fontWeight: "600",
    },
    headerTitleButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.lmedium,
      borderRadius: radius.medium,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    headerTitleText: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.colors.text,
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.medium,
      paddingHorizontal: spacing.medium,
      paddingTop: spacing.medium,
      paddingBottom: spacing.small,
    },
    navButton: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
      gap: 6,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
      borderRadius: radius.medium,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: actionColor,
    },
    navButtonPressed: {
      opacity: 0.65,
    },
    navButtonDisabled: {
      borderColor: disabledColor,
    },
    navButtonText: {
      color: actionColor,
      fontWeight: "600",
      fontSize: 16,
      flexShrink: 1,
    },
    navButtonTextDisabled: {
      color: disabledColor,
    },
  });
};
