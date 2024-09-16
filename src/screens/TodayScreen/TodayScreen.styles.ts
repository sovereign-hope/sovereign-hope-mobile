import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { spacing, elementSize, radius } from "src/style/layout";
import { header1, header2, header3 } from "src/style/typography";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  scrollView: ViewStyle;
  loadingContainer: ViewStyle;
  title: TextStyle;
  dayContent: ViewStyle;
  dayTitle: TextStyle;
  dayTitleIcon: ImageStyle;
  dayReadingContainer: ViewStyle;
  dayReadingColumnPrimary: ViewStyle;
  dayReadingColumnSecondary: ViewStyle;
  dayReadingHeader: TextStyle;
  notifications: ViewStyle;
  notificationBox: ViewStyle;
  notificationTitle: TextStyle;
  notificationDetails: TextStyle;
  notificationInfo: ViewStyle;
  disclosureIcon: ViewStyle;
  whiteText: TextStyle;
  memoryText: TextStyle;
  memoryLoadingContainer: ViewStyle;
  memoryQuestionHeader: TextStyle;
  memoryHelperText: TextStyle;
  memoryQuestionSubHeader: TextStyle;
  memoryQuestion: TextStyle;
  footer: ViewStyle;
  footerRow: ViewStyle;
  footerButton: ViewStyle;
  spacer: ViewStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.dark ? colors.darkGrey : colors.grey0,
    },
    scrollView: {
      backgroundColor: theme.dark ? colors.darkGrey : colors.grey0,
    },
    loadingContainer: {
      flexGrow: 1,
      marginVertical: spacing.extraExtraLarge,
    },
    title: {
      ...header1,
      padding: spacing.large,
      color: theme.dark ? colors.white : colors.darkGrey,
      backgroundColor: theme.dark ? colors.darkGrey : colors.grey0,
    },
    dayContent: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    dayTitle: {
      flexDirection: "column",
      flexShrink: 1,
    },
    dayTitleIcon: {
      fontSize: 24,
      marginRight: spacing.medium,
      marginTop: spacing.small,
    },
    dayReadingContainer: {
      flexDirection: "row",
      marginBottom: spacing.large,
    },
    dayReadingColumnPrimary: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: colors.darkGrey,
      padding: spacing.large,
      color: colors.white,
    },
    dayReadingColumnSecondary: {
      flex: 1,
      flexDirection: "row",
      paddingVertical: spacing.large,
      paddingRight: spacing.large,
      backgroundColor: colors.darkGrey,
    },
    dayReadingHeader: {
      ...header2,
      marginBottom: spacing.medium,
      color: colors.white,
    },
    notifications: {
      padding: spacing.medium,
    },
    notificationBox: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: radius.large,
      backgroundColor: colors.accent,
      padding: spacing.medium,
      paddingStart: spacing.large,
    },
    notificationInfo: {
      flex: 1,
    },
    notificationTitle: {
      ...header3,
      color: colors.white,
    },
    notificationDetails: {
      color: colors.white,
    },
    disclosureIcon: {
      marginLeft: spacing.large,
    },
    whiteText: {
      color: colors.white,
    },
    memoryLoadingContainer: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-around",
    },
    memoryQuestionHeader: {
      ...header2,
      margin: spacing.medium,
      color: colors.accent,
    },
    memoryHelperText: {
      ...header2,
      margin: spacing.medium,
      color: theme.colors.text,
    },
    memoryQuestionSubHeader: {
      fontWeight: "bold",
      marginHorizontal: spacing.large,
      marginVertical: spacing.small,
      color: theme.colors.text,
    },
    memoryQuestion: {
      marginVertical: spacing.small,
      marginHorizontal: spacing.large,
      color: theme.colors.text,
    },
    memoryText: {
      color: colors.white,
    },
    footer: {
      paddingHorizontal: spacing.medium,
      justifyContent: "flex-end",
      backgroundColor: theme.colors.background,
    },
    footerRow: {
      flex: 1,
      flexDirection: "row",
    },
    footerButton: {
      flex: 1,
      marginBottom: spacing.medium,
    },
    spacer: {
      flex: 1,
    },
  });
