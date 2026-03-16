import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { radius, spacing } from "src/style/layout";

type Props = {
  theme: Theme;
};

interface Style {
  wrapper: ViewStyle;
  container: ViewStyle;
  indicatorContainer: ViewStyle;
  indicator: ViewStyle;
  indicatorText: TextStyle;
  letterButton: ViewStyle;
  activeLetterButton: ViewStyle;
  letterText: TextStyle;
  activeLetterText: TextStyle;
  disabledLetterText: TextStyle;
}

export const SIDEBAR_PADDING_VERTICAL = spacing.small;

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    wrapper: {
      alignItems: "center",
    },
    container: {
      borderRadius: radius.large,
      backgroundColor: theme.dark
        ? theme.colors.card
        : "rgba(255,255,255,0.92)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingVertical: SIDEBAR_PADDING_VERTICAL,
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
    indicatorContainer: {
      position: "absolute",
      bottom: "100%",
      marginBottom: spacing.small,
      alignItems: "center",
    },
    indicator: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.black,
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      elevation: 4,
    },
    indicatorText: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.white,
    },
    letterButton: {
      minWidth: 18,
      paddingHorizontal: spacing.xs,
      paddingVertical: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.small,
    },
    activeLetterButton: {
      backgroundColor: colors.accent,
    },
    letterText: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.accent,
    },
    activeLetterText: {
      color: colors.white,
      fontWeight: "700",
    },
    disabledLetterText: {
      color: theme.colors.border,
      opacity: 0.9,
    },
  });
