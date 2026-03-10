import { StyleSheet, ViewStyle } from "react-native";
import { Theme } from "@react-navigation/native";

type Props = {
  theme: Theme;
  isEinkMode: boolean;
};

interface Style {
  screen: ViewStyle;
  loadingContainer: ViewStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  });
