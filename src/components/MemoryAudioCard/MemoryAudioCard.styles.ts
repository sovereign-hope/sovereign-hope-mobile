import { Theme } from "@react-navigation/native";
import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { colors } from "src/style/colors";
import { elementSize, radius, spacing } from "src/style/layout";
import { body, header3 } from "src/style/typography";

type Props = {
  theme: Theme;
  isEinkMode?: boolean;
};

interface Style {
  card: ViewStyle;
  embeddedCard: ViewStyle;
  loadingState: ViewStyle;
  loadingTitle: TextStyle;
  loadingCaption: TextStyle;
  loadingProgressTrack: ViewStyle;
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
  segmentedRow: ViewStyle;
  segmentButton: ViewStyle;
  segmentButtonSelected: ViewStyle;
  segmentButtonText: TextStyle;
  segmentButtonTextSelected: TextStyle;
  stopButton: ViewStyle;
  modalBackdrop: ViewStyle;
  modalCard: ViewStyle;
  modalTitle: TextStyle;
  modalBody: TextStyle;
}

export const styles = ({ theme, isEinkMode = false }: Props): Style =>
  StyleSheet.create({
    card: {
      marginBottom: spacing.medium,
      marginHorizontal: spacing.large,
      padding: spacing.medium,
      borderRadius: radius.large,
      backgroundColor: theme.colors.card,
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: theme.colors.border,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: isEinkMode ? 0 : 0.1,
    },
    embeddedCard: {
      marginBottom: 0,
      marginHorizontal: 0,
      padding: 0,
      borderRadius: 0,
      backgroundColor: "transparent",
      borderWidth: 0,
      borderColor: "transparent",
      shadowOpacity: 0,
    },
    loadingState: {
      paddingVertical: spacing.lmedium,
      alignItems: "stretch",
      justifyContent: "center",
      gap: spacing.small,
    },
    loadingTitle: {
      ...body,
      color: theme.colors.text,
      fontWeight: "600",
      textAlign: "center",
    },
    loadingCaption: {
      ...body,
      color: theme.colors.text,
      textAlign: "center",
      fontSize: 13,
    },
    loadingProgressTrack: {
      marginTop: spacing.xs,
      marginHorizontal: spacing.large,
    },
    sessionControlRow: {
      flexDirection: "row",
      gap: spacing.small,
      marginTop: spacing.lmedium,
      marginBottom: spacing.small,
    },
    sessionActionButton: {
      flex: 4,
      flexDirection: "row",
      minHeight: elementSize.small,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.lmedium,
      borderRadius: radius.medium,
      backgroundColor: isEinkMode ? theme.colors.background : colors.accent,
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: isEinkMode ? theme.colors.primary : "transparent",
      justifyContent: "center",
      alignItems: "center",
    },
    settingsIconButton: {
      flex: 1,
      minHeight: elementSize.small,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: isEinkMode ? theme.colors.background : theme.colors.card,
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
      color: theme.colors.text,
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
      backgroundColor: isEinkMode ? theme.colors.background : colors.accent,
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: isEinkMode ? theme.colors.primary : "transparent",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.small,
    },
    actionButtonLabel: {
      ...body,
      fontWeight: "600",
      color: isEinkMode ? theme.colors.primary : colors.white,
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
    segmentedRow: {
      flexDirection: "row",
      gap: spacing.small,
      marginBottom: spacing.medium,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: spacing.medium,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    segmentButtonSelected: {
      backgroundColor: isEinkMode ? theme.colors.background : colors.accent,
      borderColor: isEinkMode ? theme.colors.primary : colors.accent,
    },
    segmentButtonText: {
      ...body,
      fontSize: 14,
      color: theme.colors.text,
    },
    segmentButtonTextSelected: {
      color: isEinkMode ? theme.colors.primary : colors.white,
      fontWeight: "600",
    },
    stopButton: {
      backgroundColor: isEinkMode ? theme.colors.background : colors.red,
      ...(isEinkMode
        ? {
            borderColor: theme.colors.primary,
            borderWidth: 1,
          }
        : {}),
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: "center",
      padding: spacing.large,
      backgroundColor: isEinkMode ? colors.white : "rgba(0,0,0,0.45)",
    },
    modalCard: {
      width: "100%",
      maxWidth: 520,
      alignSelf: "center",
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
