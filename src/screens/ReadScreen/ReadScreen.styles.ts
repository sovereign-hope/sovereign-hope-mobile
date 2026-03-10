import { StyleSheet, ViewStyle } from "react-native";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";

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
      backgroundColor: theme.dark ? theme.colors.background : colors.white,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  });
