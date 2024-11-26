import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { spacing, elementSize, radius } from "src/style/layout";
import { body, header1, header2, header3 } from "src/style/typography";
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
  content: ViewStyle;
  dayTitle: TextStyle;
  dayTitleIcon: ImageStyle;
  headerRow: ViewStyle;
  textButton: TextStyle;
  contentCard: ViewStyle;
  contentCardColumn: ViewStyle;
  contentCardHeader: TextStyle;
  scrollRow: ViewStyle;
  dayReadingColumnSecondary: ViewStyle;
  header: TextStyle;
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
  image: ImageStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flexGrow: 1,
      marginVertical: spacing.extraExtraLarge,
    },
    title: {
      ...header1,
      padding: spacing.large,
      color: theme.dark ? colors.white : colors.darkGrey,
    },
    content: {
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
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginHorizontal: spacing.medium,
    },
    textButton: {
      ...body,
      color: colors.accent,
      margin: spacing.medium,
    },
    contentCard: {
      flexShrink: 1,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
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
    contentCardColumn: {
      flex: 1,
      flexDirection: "column",
      color: theme.dark ? colors.white : colors.darkGrey,
    },
    contentCardHeader: {
      ...header3,
      color: theme.dark ? colors.white : colors.darkGrey,
      marginBottom: spacing.medium,
    },
    dayReadingColumnSecondary: {
      flex: 1,
      flexDirection: "row",
      paddingVertical: spacing.large,
      paddingRight: spacing.large,
      backgroundColor: colors.darkGrey,
    },
    header: {
      ...header2,
      margin: spacing.medium,
      color: theme.colors.text,
    },
    scrollRow: {},
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
      marginLeft: spacing.medium,
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
      color: colors.accent,
    },
    memoryHelperText: {
      ...header2,
      color: theme.colors.text,
      marginTop: spacing.medium,
    },
    memoryQuestionSubHeader: {
      fontWeight: "bold",
      marginVertical: spacing.small,
      color: theme.colors.text,
    },
    memoryQuestion: {
      marginVertical: spacing.small,
      color: theme.colors.text,
    },
    memoryText: {
      color: theme.dark ? colors.white : colors.darkGrey,
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
    image: {
      width: 50,
      height: 50,
      borderColor: theme.dark ? colors.white : colors.darkGrey,
      borderWidth: 1,
      borderRadius: radius.medium,
    },
  });
