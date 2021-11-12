import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { elementSize, elevation, radius, spacing } from "src/style/layout";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";

type Props = {
  theme: Theme;
};

interface Style {
  button: ViewStyle;
  icon: ViewStyle;
  text: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
      minHeight: elementSize.small,
      borderRadius: radius.medium,
      elevation: elevation.small,
      backgroundColor: theme.dark ? colors.brand : colors.darkGrey,
    },
    icon: {
      marginRight: spacing.small,
    },
    text: {
      color: colors.white,
      flex: 1,
      textAlign: "center",
    },
  });
