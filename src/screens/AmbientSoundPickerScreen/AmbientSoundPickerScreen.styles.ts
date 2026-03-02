import { Theme } from "@react-navigation/native";
import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { colors } from "src/style/colors";
import { radius, spacing } from "src/style/layout";
import { body, header3 } from "src/style/typography";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  headerCard: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  notice: TextStyle;
  listContainer: ViewStyle;
  soundRow: ViewStyle;
  soundRowSelected: ViewStyle;
  soundRowMain: ViewStyle;
  rowHeader: ViewStyle;
  soundLabel: TextStyle;
  soundDescription: TextStyle;
  previewButton: ViewStyle;
  previewButtonDisabled: ViewStyle;
  previewButtonLabel: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerCard: {
      backgroundColor: theme.colors.card,
      borderRadius: radius.large,
      marginHorizontal: spacing.large,
      marginTop: spacing.large,
      padding: spacing.large,
      gap: spacing.small,
    },
    title: {
      ...header3,
      color: theme.colors.text,
    },
    subtitle: {
      ...body,
      color: theme.colors.text,
    },
    notice: {
      ...body,
      color: colors.red,
    },
    listContainer: {
      marginTop: spacing.large,
      marginHorizontal: spacing.large,
      marginBottom: spacing.extraLarge,
      gap: spacing.medium,
    },
    soundRow: {
      borderRadius: radius.large,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: spacing.lmedium,
      gap: spacing.medium,
    },
    soundRowSelected: {
      borderColor: colors.accent,
    },
    soundRowMain: {
      gap: spacing.small,
    },
    rowHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.medium,
    },
    soundLabel: {
      ...header3,
      color: theme.colors.text,
      flex: 1,
    },
    soundDescription: {
      ...body,
      color: theme.dark ? colors.grey0 : colors.grey2,
    },
    previewButton: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.small,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.lmedium,
      borderRadius: radius.medium,
      backgroundColor: colors.accent,
    },
    previewButtonDisabled: {
      opacity: 0.5,
    },
    previewButtonLabel: {
      ...body,
      color: colors.white,
      fontWeight: "600",
    },
  });
