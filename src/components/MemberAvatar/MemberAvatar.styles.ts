import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from "react-native";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { spacing } from "src/style/layout";

interface Style {
  avatarBase: ViewStyle;
  fallbackContainer: ViewStyle;
  fallbackText: TextStyle;
  image: ImageStyle;
}

interface ModalStyle {
  backdrop: ViewStyle;
  content: ViewStyle;
  enlargedImage: ImageStyle;
  name: TextStyle;
}

type Props = {
  theme: Theme;
  size: number;
};

export const styles = ({ theme, size }: Props): Style =>
  StyleSheet.create({
    avatarBase: {
      width: size,
      height: size,
      borderRadius: size / 2,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    fallbackContainer: {
      backgroundColor: colors.accent,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    fallbackText: {
      color: colors.white,
      fontWeight: "700",
      fontSize: Math.max(12, Math.round(size * 0.36)),
    },
    image: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.colors.card,
    },
  });

export const modalStyles = ({ theme, size }: Props): ModalStyle =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      alignItems: "center",
    },
    enlargedImage: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.colors.card,
    },
    name: {
      color: colors.white,
      fontSize: 18,
      fontWeight: "600",
      marginTop: spacing.large,
    },
  });
