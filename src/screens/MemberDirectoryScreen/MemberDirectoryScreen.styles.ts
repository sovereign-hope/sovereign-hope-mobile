import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { radius, spacing } from "src/style/layout";
import { header3 } from "src/style/typography";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  contentContainer: ViewStyle;
  searchInput: TextStyle;
  row: ViewStyle;
  rowName: TextStyle;
  rowDivider: ViewStyle;
  centeredState: ViewStyle;
  stateText: TextStyle;
  retryButton: ViewStyle;
  retryButtonText: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      paddingHorizontal: spacing.large,
      paddingBottom: spacing.extraLarge,
    },
    searchInput: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: radius.medium,
      backgroundColor: theme.colors.card,
      color: theme.colors.text,
      paddingHorizontal: spacing.large,
      paddingVertical: spacing.lmedium,
      marginTop: spacing.medium,
      marginBottom: spacing.large,
      fontSize: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lmedium,
      paddingVertical: spacing.lmedium,
      backgroundColor: theme.colors.background,
    },
    rowName: {
      ...header3,
      color: theme.colors.text,
      flex: 1,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginLeft: 56,
    },
    centeredState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.extraLarge,
    },
    stateText: {
      color: theme.colors.text,
      opacity: 0.8,
      textAlign: "center",
    },
    retryButton: {
      marginTop: spacing.large,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: colors.accent,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
    },
    retryButtonText: {
      color: colors.accent,
      fontWeight: "600",
    },
  });
