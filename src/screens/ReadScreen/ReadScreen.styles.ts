import { StyleSheet, ViewStyle } from "react-native";
import { spacing } from "src/style/layout";
import { Theme } from "@react-navigation/native";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  container: ViewStyle;
  footer: ViewStyle;
  spacer: ViewStyle;
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
    footer: {
      marginHorizontal: spacing.small,
      marginBottom: spacing.small,
      justifyContent: "flex-end",
    },
    spacer: {
      flex: 1,
    },
  });
