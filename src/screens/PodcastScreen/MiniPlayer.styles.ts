import { StyleSheet, ViewStyle, TextStyle } from "react-native";
import { spacing } from "src/style/layout";
import { header3 } from "src/style/typography";
import { colors } from "src/style/colors";
import { Theme } from "@react-navigation/native";

type Props = {
  theme: Theme;
};

interface Style {
  player: ViewStyle;
  title: TextStyle;
  header: ViewStyle;
  progressContainer: ViewStyle;
  progressBar: ViewStyle;
  progressText: TextStyle;
  controls: ViewStyle;
  controlIcon: ViewStyle;
  closeIcon: ViewStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    player: {
      position: "absolute",
      bottom: 0,
      left: 0,
      width: "100%",
      padding: spacing.medium,
      backgroundColor: theme.colors.card,
      borderTopColor: colors.accent,
      borderTopWidth: 2,
      borderBottomColor: colors.accent,
      borderBottomWidth: 2,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: -5,
      },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      zIndex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
    },
    progressContainer: {
      width: "100%",
      marginVertical: spacing.medium,
      alignItems: "center",
    },
    progressBar: {
      width: "100%",
      margin: spacing.medium,
    },
    progressText: {
      color: theme.colors.text,
    },
    title: {
      ...header3,
      color: theme.colors.text,
      marginBottom: spacing.small,
      flex: 1,
    },
    controls: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    controlIcon: {
      padding: spacing.medium,
      borderRadius: 24,
    },
    closeIcon: {
      padding: spacing.medium,
      borderRadius: 24,
    },
  });
