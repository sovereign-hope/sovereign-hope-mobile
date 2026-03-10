import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { spacing } from "src/style/layout";

type Props = {
  theme: Theme;
  isEinkMode: boolean;
};

interface Style {
  screen: ViewStyle;
  loadingContainer: ViewStyle;
  toolbar: ViewStyle;
  toolbarButton: ViewStyle;
  toolbarButtonPressed: ViewStyle;
  toolbarLabel: TextStyle;
}

export const styles = ({ theme, isEinkMode }: Props): Style => {
  const actionColor = isEinkMode
    ? theme.dark
      ? colors.white
      : colors.black
    : colors.accent;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    toolbar: {
      flexDirection: "row",
      justifyContent: "space-evenly",
      alignItems: "center",
      paddingTop: spacing.medium,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    toolbarButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.small,
      paddingHorizontal: spacing.large,
    },
    toolbarButtonPressed: {
      opacity: 0.5,
    },
    toolbarLabel: {
      fontSize: 10,
      marginTop: 2,
      color: actionColor,
    },
  });
};
