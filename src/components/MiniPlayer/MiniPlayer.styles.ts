import { StyleSheet, ViewStyle, TextStyle } from "react-native";
import { radius, spacing } from "src/style/layout";
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
      left: "2%",
      width: "96%",
      padding: spacing.medium,
      backgroundColor: colors.blue,
      borderWidth: 1,
      borderRadius: radius.large,
      borderColor: colors.blue,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: -5,
      },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      zIndex: 100,
      opacity: 0.95,
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
      color: colors.white,
    },
    title: {
      ...header3,
      color: colors.white,
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
