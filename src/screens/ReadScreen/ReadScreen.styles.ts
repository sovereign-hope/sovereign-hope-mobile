import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { radius, spacing } from "src/style/layout";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { header2 } from "src/style/typography";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  container: ViewStyle;
  title: TextStyle;
  footer: ViewStyle;
  spacer: ViewStyle;
  button: ViewStyle;
  memoryButton: ViewStyle;
  memoryButtonText: TextStyle;
  memoryButtonIcon: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: theme.colors.background,
    },
    container: {
      paddingHorizontal: spacing.large,
    },
    title: {
      ...header2,
      color: theme.colors.text,
      marginTop: spacing.large,
    },
    footer: {
      marginHorizontal: spacing.small,
      marginBottom: spacing.small,
      justifyContent: "flex-end",
    },
    spacer: {
      flex: 1,
    },
    button: {
      marginBottom: spacing.medium,
    },
    memoryButton: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.medium,
      backgroundColor: colors.red,
      borderRadius: radius.large,
      marginBottom: spacing.medium,
    },
    memoryButtonText: {
      color: colors.white,
    },
    memoryButtonIcon: {
      fontSize: 32,
      marginRight: spacing.medium,
    },
  });
