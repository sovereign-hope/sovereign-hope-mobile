import { Platform, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { Theme } from "@react-navigation/native";
import { spacing, radius } from "src/style/layout";

type Props = {
  theme: Theme;
  bottomInset: number;
};

interface Style {
  container: ViewStyle;
  containerSolid: ViewStyle;
  containerBlurFallback: ViewStyle;
  glassBackground: ViewStyle;
  blurBackground: ViewStyle;
  blurOverlay: ViewStyle;
  row: ViewStyle;
  button: ViewStyle;
  buttonPressed: ViewStyle;
  label: TextStyle;
}

const PILL_RADIUS = 24;

export const styles = ({ theme, bottomInset }: Props): Style => {
  const cornerRadius = Platform.OS === "ios" ? PILL_RADIUS : radius.large;

  return StyleSheet.create({
    container: {
      position: "absolute",
      bottom: bottomInset + spacing.medium,
      left: spacing.medium,
      right: spacing.medium,
      borderRadius: cornerRadius,
      overflow: "hidden",
    },
    containerSolid: {
      backgroundColor: theme.colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    containerBlurFallback: {
      backgroundColor: theme.colors.card,
    },
    glassBackground: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: cornerRadius,
    },
    blurBackground: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: cornerRadius,
    },
    blurOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.dark
        ? "rgba(0,0,0,0.15)"
        : "rgba(255,255,255,0.15)",
      borderRadius: cornerRadius,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.medium,
    },
    button: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.small,
    },
    buttonPressed: {
      opacity: 0.5,
    },
    label: {
      fontSize: 12,
      marginTop: 2,
      color: theme.colors.text,
    },
  });
};
