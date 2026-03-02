import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { spacing, radius } from "src/style/layout";
import { header2 } from "src/style/typography";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  scrollContent: ViewStyle;
  contentContainer: ViewStyle;
  contentContainerTablet: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  cardContainerView: ViewStyle;
  cardView: ViewStyle;
  cardViewTablet: ViewStyle;
  cardViewAndroidTablet: ViewStyle;
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
    scrollContent: {
      flexGrow: 1,
      alignItems: "center",
      paddingBottom: spacing.large,
    },
    contentContainer: {
      width: "100%",
    },
    contentContainerTablet: {
      maxWidth: 720,
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
    cardViewTablet: {
      width: "100%",
      height: undefined,
      aspectRatio: 2.35,
    },
    cardViewAndroidTablet: {
      width: "100%",
      height: undefined,
      aspectRatio: 1.8,
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
