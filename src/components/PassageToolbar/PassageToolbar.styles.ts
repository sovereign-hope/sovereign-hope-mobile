import { Platform, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { Theme } from "@react-navigation/native";
import { spacing, radius } from "src/style/layout";

const PILL_RADIUS = 24;
const cornerRadius = Platform.OS === "ios" ? PILL_RADIUS : radius.large;

// ── Theme-independent styles ─────────────────────────────────────
// These must remain referentially stable across theme changes so
// the Animated.View's native layer is never torn down — which would
// destroy the GlassView's UIVisualEffectView compositing.

interface StableStyle {
  container: ViewStyle;
  glassBackground: ViewStyle;
  blurBackground: ViewStyle;
  row: ViewStyle;
}

const stableStyles = ({ bottomInset }: { bottomInset: number }): StableStyle =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: bottomInset + spacing.medium,
      left: spacing.medium,
      right: spacing.medium,
      borderRadius: cornerRadius,
      overflow: "hidden",
    },
    glassBackground: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: cornerRadius,
    },
    blurBackground: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: cornerRadius,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.medium,
    },
  });

// ── Theme-dependent styles ───────────────────────────────────────

interface ThemedStyle {
  containerSolid: ViewStyle;
  containerBlurFallback: ViewStyle;
  blurOverlay: ViewStyle;
  button: ViewStyle;
  buttonPressed: ViewStyle;
  label: TextStyle;
}

const themedStyles = ({ theme }: { theme: Theme }): ThemedStyle =>
  StyleSheet.create({
    containerSolid: {
      backgroundColor: theme.colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    containerBlurFallback: {
      backgroundColor: theme.colors.card,
    },
    blurOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.dark
        ? "rgba(0,0,0,0.15)"
        : "rgba(255,255,255,0.15)",
      borderRadius: cornerRadius,
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

export const styles = {
  stable: stableStyles,
  themed: themedStyles,
};
