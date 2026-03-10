import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { elementSize, radius, spacing } from "src/style/layout";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";

type Props = {
  theme: Theme;
  isEinkMode?: boolean;
};

interface Style {
  buttonRow: ViewStyle;
  button: ViewStyle;
  buttonSecondary: ViewStyle;
  buttonSecondaryPressed: ViewStyle;
  buttonSecondaryDisabled: ViewStyle;
  buttonSecondaryText: TextStyle;
  buttonSecondaryTextDisabled: TextStyle;
}

export const styles = ({ theme, isEinkMode = false }: Props): Style =>
  StyleSheet.create({
    buttonRow: {
      flexDirection: "row",
      gap: spacing.medium,
    },
    button: {
      flex: 1,
    },
    buttonSecondary: {
      flex: 1,
      minHeight: elementSize.small,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background,
    },
    buttonSecondaryPressed: {
      opacity: isEinkMode ? 1 : 0.8,
      backgroundColor: isEinkMode ? colors.grey0 : theme.colors.background,
    },
    buttonSecondaryDisabled: {
      opacity: isEinkMode ? 1 : 0.4,
      backgroundColor: isEinkMode ? colors.grey0 : theme.colors.background,
    },
    buttonSecondaryText: {
      color: theme.colors.text,
      fontWeight: "600",
    },
    buttonSecondaryTextDisabled: {
      color: theme.colors.border,
    },
  });
