import { Theme } from "@react-navigation/native";
import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { colors } from "src/style/colors";
import { elementSize, radius, spacing } from "src/style/layout";
import { body, header3 } from "src/style/typography";

type Props = {
  theme: Theme;
};

interface Style {
  card: ViewStyle;
  embeddedCard: ViewStyle;
  sessionControlRow: ViewStyle;
  sessionActionButton: ViewStyle;
  settingsIconButton: ViewStyle;
  metricsRow: ViewStyle;
  progressText: TextStyle;
  metricLabel: TextStyle;
  metricValue: TextStyle;
  actionButton: ViewStyle;
  actionButtonLabel: TextStyle;
  secondaryButton: ViewStyle;
  secondaryButtonLabel: TextStyle;
  stopButton: ViewStyle;
  modalBackdrop: ViewStyle;
  modalCard: ViewStyle;
  modalTitle: TextStyle;
  modalBody: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    card: {
      marginBottom: spacing.medium,
      marginHorizontal: spacing.large,
      padding: spacing.medium,
      borderRadius: radius.large,
      backgroundColor: theme.colors.card,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
    },
    embeddedCard: {
      marginBottom: 0,
      marginHorizontal: 0,
      padding: 0,
      borderRadius: 0,
      backgroundColor: "transparent",
      shadowOpacity: 0,
    },
    sessionControlRow: {
      flexDirection: "row",
      gap: spacing.small,
      marginTop: spacing.small,
      marginBottom: spacing.small,
    },
    sessionActionButton: {
      flex: 4,
      minHeight: elementSize.small,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.lmedium,
      borderRadius: radius.medium,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
    },
    settingsIconButton: {
      flex: 1,
      minHeight: elementSize.small,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.dark ? colors.darkerGrey : colors.grey0,
      alignItems: "center",
      justifyContent: "center",
    },
    metricsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.small,
      gap: spacing.medium,
    },
    progressText: {
      ...body,
      color: theme.colors.text,
    },
    metricLabel: {
      ...body,
      color: theme.dark ? colors.grey0 : colors.grey2,
    },
    metricValue: {
      ...body,
      color: theme.colors.text,
      fontWeight: "600",
      flexShrink: 1,
      textAlign: "right",
    },
    actionButton: {
      minHeight: elementSize.small,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.lmedium,
      borderRadius: radius.medium,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.small,
    },
    actionButtonLabel: {
      ...body,
      fontWeight: "600",
      color: colors.white,
    },
    secondaryButton: {
      minHeight: elementSize.small,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.lmedium,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    secondaryButtonLabel: {
      ...body,
      fontWeight: "600",
      color: theme.colors.text,
    },
    stopButton: {
      backgroundColor: colors.red,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: "center",
      padding: spacing.large,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    modalCard: {
      borderRadius: radius.large,
      backgroundColor: theme.colors.card,
      padding: spacing.large,
      gap: spacing.medium,
    },
    modalTitle: {
      ...header3,
      color: theme.colors.text,
    },
    modalBody: {
      ...body,
      color: theme.colors.text,
    },
  });
