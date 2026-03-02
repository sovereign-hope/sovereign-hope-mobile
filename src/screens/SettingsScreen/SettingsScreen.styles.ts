import { Platform, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { elementSize, radius, spacing } from "src/style/layout";
import { header3 } from "src/style/typography";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";

type Props = {
  theme: Theme;
  isEinkMode?: boolean;
};

interface Style {
  screen: ViewStyle;
  settingsSectionHeader: TextStyle;
  settingsGroup: ViewStyle;
  settingsRow: ViewStyle;
  settingsRowGrouped: ViewStyle;
  settingsRowGroupedLast: ViewStyle;
  settingsRowPressed: ViewStyle;
  settingsRowText: TextStyle;
  settingsRowTextContainer: ViewStyle;
  settingsRowSubtext: TextStyle;
  settingsRowValueContainer: ViewStyle;
  disclosureIcon: ViewStyle;
  accountPanel: ViewStyle;
  accountPanelMutedText: TextStyle;
  accountErrorText: TextStyle;
  accountButtonRow: ViewStyle;
  accountButton: ViewStyle;
  accountButtonPrimary: ViewStyle;
  accountButtonDanger: ViewStyle;
  accountButtonText: TextStyle;
  accountButtonPrimaryText: TextStyle;
  accountButtonDangerText: TextStyle;
  accountDivider: ViewStyle;
  accountSmallDangerButton: ViewStyle;
  accountSmallDangerButtonText: TextStyle;
  modalBackdrop: ViewStyle;
  modalCard: ViewStyle;
  modalTitle: TextStyle;
  modalBody: TextStyle;
  modalButtonRow: ViewStyle;
  accountTextAction: ViewStyle;
  accountTextActionDanger: TextStyle;
}

export const styles = ({ theme, isEinkMode = false }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      paddingTop: 0,
      backgroundColor: theme.colors.background,
    },
    settingsSectionHeader: {
      ...header3,
      marginHorizontal: spacing.large,
      marginTop: spacing.large,
      marginBottom:
        Platform.OS === "ios" || Platform.OS === "android"
          ? spacing.small
          : spacing.large,
      color: theme.colors.text,
    },
    settingsGroup: {
      marginHorizontal: spacing.large,
      borderRadius: radius.large,
      overflow: "hidden",
      borderWidth: isEinkMode ? 1 : StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    settingsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.colors.card,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      padding: spacing.large,
    },
    settingsRowGrouped: {
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    settingsRowGroupedLast: {
      borderBottomWidth: 0,
    },
    settingsRowPressed: {
      backgroundColor: isEinkMode
        ? theme.dark
          ? colors.darkGrey
          : colors.grey0
        : theme.colors.background,
    },
    settingsRowText: {
      color: theme.colors.text,
    },
    settingsRowTextContainer: {
      flex: 1,
      marginRight: spacing.medium,
    },
    settingsRowSubtext: {
      color: theme.colors.text,
      opacity: isEinkMode ? 1 : 0.6,
      fontSize: 14,
      marginTop: 4,
    },
    settingsRowValueContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    disclosureIcon: {
      marginLeft: spacing.large,
    },
    accountPanel: {
      backgroundColor: theme.colors.card,
      padding: spacing.large,
      ...(Platform.OS === "ios" || Platform.OS === "android"
        ? {
            marginHorizontal: spacing.large,
            borderRadius: radius.large,
            marginBottom: spacing.large,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.border,
          }
        : {}),
    },
    accountPanelMutedText: {
      color: theme.colors.text,
      opacity: isEinkMode ? 1 : 0.7,
      marginBottom: spacing.medium,
    },
    accountErrorText: {
      color: isEinkMode ? theme.colors.primary : colors.red,
      marginBottom: spacing.medium,
    },
    accountButtonRow: {
      flexDirection: "row",
      gap: spacing.medium,
      marginBottom: spacing.medium,
    },
    accountButton: {
      flex: 1,
      minHeight: elementSize.small,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background,
    },
    accountButtonPrimary: {
      backgroundColor: isEinkMode ? theme.colors.background : colors.accent,
      borderColor: isEinkMode ? theme.colors.primary : colors.accent,
    },
    accountButtonDanger: {
      borderColor: isEinkMode ? theme.colors.primary : colors.red,
    },
    accountButtonText: {
      color: theme.colors.text,
      fontWeight: "600",
    },
    accountButtonPrimaryText: {
      color: isEinkMode ? theme.colors.primary : colors.white,
    },
    accountButtonDangerText: {
      color: isEinkMode ? theme.colors.primary : colors.red,
    },
    accountDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: spacing.medium,
    },
    accountSmallDangerButton: {
      alignSelf: "flex-start",
      minHeight: elementSize.small,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: isEinkMode ? theme.colors.primary : colors.red,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
      justifyContent: "center",
      alignItems: "center",
      marginTop: spacing.small,
    },
    accountSmallDangerButtonText: {
      color: isEinkMode ? theme.colors.primary : colors.red,
      fontWeight: "600",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: isEinkMode
        ? theme.dark
          ? colors.black
          : colors.white
        : "rgba(0,0,0,0.35)",
      justifyContent: "center",
      padding: spacing.large,
    },
    modalCard: {
      backgroundColor: theme.colors.card,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: spacing.large,
    },
    modalTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: spacing.medium,
    },
    modalBody: {
      color: theme.colors.text,
      opacity: isEinkMode ? 1 : 0.8,
      marginBottom: spacing.medium,
    },
    modalButtonRow: {
      flexDirection: "row",
      gap: spacing.medium,
      marginTop: spacing.medium,
    },
    accountTextAction: {
      alignSelf: "center",
      marginTop: spacing.medium,
      paddingVertical: spacing.small,
      paddingHorizontal: spacing.small,
    },
    accountTextActionDanger: {
      color: isEinkMode ? theme.colors.primary : colors.red,
      opacity: isEinkMode ? 1 : 0.9,
      textDecorationLine: "underline",
    },
  });
