import {
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
  View,
} from "react-native";
import { spacing, elementSize, radius } from "src/style/layout";
import { header1, header2, header3 } from "src/style/typography";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  cardContainerView: ViewStyle;
  cardView: ViewStyle;
  banner: ImageStyle;
  cardTitle: TextStyle;
  cardSubtitle: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      paddingTop: 0,
      backgroundColor: theme.colors.card,
    },
    title: {
      ...header2,
      padding: spacing.large,
      color: theme.dark ? colors.white : colors.darkGrey,
    },
    subtitle: {
      color: theme.dark ? colors.grey0 : colors.grey2,
      paddingHorizontal: spacing.large,
    },
    cardContainerView: {
      padding: spacing.large,
    },
    cardView: {
      height: 150,
      marginBottom: spacing.medium,
      borderRadius: radius.large,
      borderWidth: 2,
      borderColor: colors.grey2,
      overflow: "hidden",
    },
    banner: {
      height: "100%",
      width: "100%",
      resizeMode: "cover",
    },
    cardTitle: {
      color: theme.dark ? colors.white : colors.darkGrey,
      fontWeight: "500",
    },
    cardSubtitle: {
      color: theme.dark ? colors.grey : colors.grey2,
    },
  });
