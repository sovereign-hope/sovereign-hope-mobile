import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { spacing } from "src/style/layout";

type Props = {
  theme: Theme;
  isEinkMode: boolean;
};

interface Style {
  screen: ViewStyle;
  loadingContainer: ViewStyle;
  toolbar: ViewStyle & { height: number };
  toolbarButton: ViewStyle;
  toolbarButtonPressed: ViewStyle;
  toolbarButtonText: TextStyle;
}

export const styles = ({ theme, isEinkMode }: Props): Style => {
  const actionColor = isEinkMode
    ? theme.dark
      ? colors.white
      : colors.black
    : colors.accent;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    toolbar: {
      height: 52,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.extraExtraLarge,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    toolbarButton: {
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      paddingVertical: spacing.small,
      paddingHorizontal: spacing.medium,
    },
    toolbarButtonPressed: {
      opacity: 0.65,
    },
    toolbarButtonText: {
      fontSize: 11,
      color: actionColor,
      fontWeight: "500",
    },
  });
};
