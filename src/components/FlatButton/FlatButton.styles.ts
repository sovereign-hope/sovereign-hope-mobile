import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { elementSize, elevation, radius, spacing } from "src/style/layout";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";

type Props = {
  theme: Theme;
  isEinkMode?: boolean;
};

interface Style {
  button: ViewStyle;
  icon: ViewStyle;
  text: TextStyle;
}

export const styles = ({ theme, isEinkMode = false }: Props): Style =>
  StyleSheet.create({
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
      minHeight: elementSize.small,
      borderRadius: radius.medium,
      elevation: isEinkMode ? 0 : elevation.small,
      backgroundColor: isEinkMode ? theme.colors.background : colors.accent,
      borderColor: isEinkMode ? theme.colors.primary : theme.colors.card,
      ...(isEinkMode
        ? {
            borderWidth: 1,
          }
        : {}),
    },
    icon: {
      marginRight: spacing.small,
    },
    text: {
      color: isEinkMode ? theme.colors.primary : colors.white,
      flex: 1,
      textAlign: "center",
    },
  });
