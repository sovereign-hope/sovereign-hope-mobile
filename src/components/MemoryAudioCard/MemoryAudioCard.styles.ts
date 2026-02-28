import { Theme } from "@react-navigation/native";
import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { colors } from "src/style/colors";
import { radius, spacing } from "src/style/layout";
import { body, header3 } from "src/style/typography";

type Props = {
  theme: Theme;
};

interface Style {
  card: ViewStyle;
  cardHeader: TextStyle;
  cardSubHeader: TextStyle;
  statusRow: ViewStyle;
  statusText: TextStyle;
  progressText: TextStyle;
  actionButton: ViewStyle;
  actionButtonLabel: TextStyle;
  stopButton: ViewStyle;
  soundPicker: ViewStyle;
  soundPill: ViewStyle;
  soundPillSelected: ViewStyle;
  soundPillText: TextStyle;
  soundPillTextSelected: TextStyle;
  helperText: TextStyle;
  modalBackdrop: ViewStyle;
  modalCard: ViewStyle;
  modalTitle: TextStyle;
  modalBody: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    card: {
      marginBottom: spacing.large,
      marginHorizontal: spacing.large,
      padding: spacing.lmedium,
      borderRadius: radius.large,
      backgroundColor: theme.colors.card,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
    },
    cardHeader: {
      ...header3,
      color: theme.colors.text,
      marginBottom: spacing.small,
    },
    cardSubHeader: {
      ...body,
      color: theme.colors.text,
      marginBottom: spacing.small,
    },
    statusRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.medium,
      gap: spacing.medium,
    },
    statusText: {
      ...body,
      color: theme.colors.text,
      flex: 1,
    },
    progressText: {
      ...body,
      color: theme.colors.text,
      marginBottom: spacing.medium,
    },
    actionButton: {
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.lmedium,
      borderRadius: radius.medium,
      backgroundColor: colors.accent,
      alignItems: "center",
      marginBottom: spacing.medium,
    },
    actionButtonLabel: {
      ...header3,
      color: colors.white,
    },
    stopButton: {
      backgroundColor: colors.red,
    },
    soundPicker: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.small,
      marginTop: spacing.small,
    },
    soundPill: {
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: spacing.small,
      paddingHorizontal: spacing.medium,
    },
    soundPillSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    soundPillText: {
      ...body,
      color: theme.colors.text,
      fontSize: 13,
    },
    soundPillTextSelected: {
      color: colors.white,
    },
    helperText: {
      ...body,
      color: theme.dark ? colors.grey0 : colors.grey2,
      marginTop: spacing.small,
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
