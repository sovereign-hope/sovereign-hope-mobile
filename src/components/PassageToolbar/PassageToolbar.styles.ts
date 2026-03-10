import { StyleSheet, ViewStyle, TextStyle } from "react-native";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { spacing, radius } from "src/style/layout";

type Props = {
  theme: Theme;
  isEinkMode: boolean;
};

interface Style {
  container: ViewStyle;
  containerSolid: ViewStyle;
  glassBackground: ViewStyle;
  blurBackground: ViewStyle;
  blurOverlay: ViewStyle;
  row: ViewStyle;
  button: ViewStyle;
  buttonPressed: ViewStyle;
  label: TextStyle;
}

export const styles = ({ theme, isEinkMode }: Props): Style => {
  const actionColor = isEinkMode
    ? theme.dark
      ? colors.white
      : colors.black
    : colors.accent;

  return StyleSheet.create({
    container: {
      position: "absolute",
      top: spacing.medium,
      right: spacing.medium,
      borderRadius: radius.large,
      overflow: "hidden",
    },
    containerSolid: {
      backgroundColor: theme.colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    glassBackground: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius.large,
    },
    blurBackground: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius.large,
    },
    blurOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.dark
        ? "rgba(0,0,0,0.15)"
        : "rgba(255,255,255,0.15)",
      borderRadius: radius.large,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.large,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
    },
    button: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.small,
    },
    buttonPressed: {
      opacity: 0.5,
    },
    label: {
      fontSize: 10,
      marginTop: 2,
      color: actionColor,
    },
  });
};
