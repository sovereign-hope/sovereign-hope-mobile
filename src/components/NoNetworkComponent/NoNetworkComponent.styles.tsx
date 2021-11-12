import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { spacing } from "src/style/layout";
import { header2 } from "src/style/typography";
import { Theme } from "@react-navigation/native";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  headerText: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
    },
    headerText: {
      ...header2,
      margin: spacing.medium,
      textAlign: "center",
      color: theme.colors.text,
    },
  });
