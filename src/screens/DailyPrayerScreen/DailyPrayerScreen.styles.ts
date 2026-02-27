import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { radius, spacing } from "src/style/layout";
import { header2, header3 } from "src/style/typography";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  listContent: ViewStyle;
  headerTitle: TextStyle;
  fallbackContainer: ViewStyle;
  fallbackNote: TextStyle;
  fallbackActionText: TextStyle;
  card: ViewStyle;
  cardTextContainer: ViewStyle;
  cardName: TextStyle;
  centeredState: ViewStyle;
  stateTitle: TextStyle;
  stateText: TextStyle;
  retryButton: ViewStyle;
  retryButtonDisabled: ViewStyle;
  retryButtonText: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: spacing.large,
      paddingTop: spacing.large,
    },
    listContent: {
      paddingBottom: spacing.extraLarge,
      gap: spacing.medium,
    },
    headerTitle: {
      ...header2,
      color: theme.colors.text,
      marginBottom: spacing.large,
    },
    fallbackContainer: {
      marginBottom: spacing.large,
      gap: spacing.small,
    },
    fallbackNote: {
      color: theme.colors.text,
      opacity: 0.7,
    },
    fallbackActionText: {
      color: colors.accent,
      fontWeight: "600",
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: radius.medium,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      padding: spacing.large,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.large,
    },
    cardTextContainer: {
      flex: 1,
      gap: spacing.small,
    },
    cardName: {
      ...header3,
      color: theme.colors.text,
    },
    centeredState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.extraLarge,
    },
    stateTitle: {
      ...header3,
      color: theme.colors.text,
      marginBottom: spacing.small,
      textAlign: "center",
    },
    stateText: {
      color: theme.colors.text,
      opacity: 0.8,
      textAlign: "center",
    },
    retryButton: {
      marginTop: spacing.large,
      minHeight: 45,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: colors.accent,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
      justifyContent: "center",
      alignItems: "center",
    },
    retryButtonDisabled: {
      opacity: 0.5,
    },
    retryButtonText: {
      color: colors.accent,
      fontWeight: "600",
    },
  });
