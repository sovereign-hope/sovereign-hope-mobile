import { StyleSheet } from "react-native";
import type { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";
import { spacing, radius } from "src/style/layout";

interface StyleProps {
  theme: Theme;
  isEinkMode: boolean;
}

export const styles = ({ theme, isEinkMode }: StyleProps) => {
  const actionColor = isEinkMode
    ? theme.dark
      ? colors.white
      : colors.black
    : colors.accent;

  return StyleSheet.create({
    sheetBackground: {
      backgroundColor: theme.colors.card,
    },
    handleIndicator: {
      backgroundColor: theme.dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)",
    },
    bookListContent: {
      paddingBottom: spacing.extraExtraLarge,
    },
    sectionHeader: {
      paddingHorizontal: spacing.medium,
      paddingVertical: spacing.small,
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: theme.dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
      backgroundColor: theme.colors.card,
    },
    bookRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.medium,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    bookRowSelected: {
      backgroundColor: theme.dark
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.04)",
    },
    bookRowPressed: {
      opacity: 0.65,
    },
    bookName: {
      fontSize: 17,
      color: theme.colors.text,
    },
    bookNameSelected: {
      color: actionColor,
      fontWeight: "600",
    },
    chapterCount: {
      fontSize: 14,
      color: theme.dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)",
    },
    // ── Chapter grid ──────────────────────────────
    chapterContainer: {
      flex: 1,
    },
    chapterHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.medium,
      paddingVertical: spacing.small,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    chapterTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.colors.text,
    },
    backButton: {
      minWidth: 60,
    },
    backButtonPressed: {
      opacity: 0.65,
    },
    backButtonText: {
      fontSize: 17,
      color: actionColor,
    },
    chapterGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      padding: spacing.small,
    },
    chapterCell: {
      width: "20%",
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.medium,
    },
    chapterCellSelected: {
      backgroundColor: actionColor,
    },
    chapterCellPressed: {
      opacity: 0.65,
    },
    chapterNumber: {
      fontSize: 16,
      color: theme.colors.text,
    },
    chapterNumberSelected: {
      color: colors.white,
      fontWeight: "700",
    },
  });
};
