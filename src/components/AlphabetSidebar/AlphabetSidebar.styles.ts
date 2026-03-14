import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { radius, spacing } from "src/style/layout";

type Props = {
  theme: Theme;
};

interface Style {
  container: ViewStyle;
  letterButton: ViewStyle;
  letterText: TextStyle;
  activeLetterText: TextStyle;
  disabledLetterText: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    container: {
      borderRadius: radius.large,
      backgroundColor: theme.dark ? theme.colors.card : "rgba(255,255,255,0.92)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingVertical: spacing.small,
      paddingHorizontal: spacing.xs,
      justifyContent: "space-between",
      alignItems: "center",
      shadowColor: colors.black,
      shadowOpacity: theme.dark ? 0 : 0.08,
      shadowRadius: 6,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      elevation: 2,
    },
    letterButton: {
      minWidth: 18,
      paddingHorizontal: spacing.xs,
      paddingVertical: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.small,
    },
    letterText: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.accent,
    },
    activeLetterText: {
      color: theme.colors.primary,
    },
    disabledLetterText: {
      color: theme.colors.border,
      opacity: 0.9,
    },
  });
