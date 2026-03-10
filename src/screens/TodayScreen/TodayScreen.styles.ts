import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { spacing, radius } from "src/style/layout";
import { body, header1, header2, header3 } from "src/style/typography";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";

type Props = {
  theme: Theme;
  isEinkMode?: boolean;
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
  subHeader: TextStyle;
  textButton: ViewStyle;
  textButtonLabel: TextStyle;
  contentCard: ViewStyle;
  memoryCard: ViewStyle;
  memoryPassageButton: ViewStyle;
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
  text: TextStyle;
  prayerAssignmentList: ViewStyle;
  prayerAssignmentRow: ViewStyle;
  prayerAssignmentName: TextStyle;
  prayerAssignmentMeta: TextStyle;
  prayerStateText: TextStyle;
  prayerActionButton: ViewStyle;
  prayerActionButtonText: TextStyle;
  dashboardGrid: ViewStyle;
  dashboardColumn: ViewStyle;
  contentCardTablet: ViewStyle;
  splitView: ViewStyle;
  splitViewSingle: ViewStyle;
  splitViewDetail: ViewStyle;
  splitViewDetailHeader: ViewStyle;
  splitViewDetailHeaderRow: ViewStyle;
  splitViewDetailHeaderActions: ViewStyle;
  splitViewDetailHeaderButton: ViewStyle;
  splitViewDetailHeaderButtonLiquidGlass: ViewStyle;
  splitViewDetailHeaderButtonGlass: ViewStyle;
  splitViewDetailCloseButton: ViewStyle;
  splitViewDetailCloseButtonLiquidGlass: ViewStyle;
  splitViewDetailHeaderButtonText: TextStyle;
}

export const styles = ({ theme, isEinkMode = false }: Props): Style =>
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
      marginVertical: spacing.extraLarge,
    },
    title: {
      ...header1,
      padding: spacing.large,
      color: theme.colors.text,
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
      alignItems: "center",
      marginHorizontal: spacing.medium,
      marginTop: spacing.medium,
      marginBottom: spacing.small,
    },
    subHeader: {
      ...header3,
      color: theme.colors.text,
      marginLeft: spacing.large,
      marginBottom: spacing.medium,
    },
    textButton: {
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.lmedium,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: isEinkMode ? theme.colors.primary : colors.accent,
    },
    textButtonLabel: {
      ...body,
      color: isEinkMode ? theme.colors.primary : colors.accent,
      fontWeight: "600",
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
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: theme.colors.border,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: isEinkMode ? 0 : 0.1,
    },
    memoryCard: {
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "stretch",
    },
    memoryPassageButton: {
      flexDirection: "row",
      alignItems: "center",
    },
    contentCardColumn: {
      flex: 1,
      flexDirection: "column",
      color: theme.colors.text,
    },
    contentCardHeader: {
      ...header3,
      color: theme.colors.text,
      marginBottom: spacing.medium,
    },
    dayReadingColumnSecondary: {
      flex: 1,
      flexDirection: "row",
      paddingVertical: spacing.large,
      paddingRight: spacing.large,
      backgroundColor: isEinkMode ? theme.colors.card : colors.darkGrey,
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
      backgroundColor: isEinkMode ? theme.colors.card : colors.accent,
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: isEinkMode ? theme.colors.primary : colors.black,
      padding: spacing.medium,
      paddingStart: spacing.large,
    },
    notificationInfo: {
      flex: 1,
    },
    notificationTitle: {
      ...header3,
      color: isEinkMode ? theme.colors.primary : colors.white,
    },
    notificationDetails: {
      color: isEinkMode ? theme.colors.primary : colors.white,
    },
    disclosureIcon: {
      marginLeft: spacing.medium,
    },
    whiteText: {
      color: isEinkMode ? theme.colors.primary : colors.white,
    },
    memoryLoadingContainer: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-around",
    },
    memoryQuestionHeader: {
      ...header2,
      color: isEinkMode ? theme.colors.primary : colors.accent,
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
      color: theme.colors.text,
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
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: radius.medium,
    },
    text: {
      ...body,
      color: theme.colors.text,
    },
    prayerAssignmentList: {
      gap: spacing.medium,
    },
    prayerAssignmentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.medium,
    },
    prayerAssignmentName: {
      ...header3,
      color: theme.colors.text,
    },
    prayerAssignmentMeta: {
      ...body,
      color: theme.colors.text,
      opacity: isEinkMode ? 1 : 0.7,
      marginBottom: spacing.medium,
    },
    prayerStateText: {
      ...body,
      color: theme.colors.text,
    },
    prayerActionButton: {
      marginTop: spacing.medium,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: isEinkMode ? theme.colors.primary : colors.accent,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
      minHeight: 45,
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "flex-start",
    },
    prayerActionButtonText: {
      color: isEinkMode ? theme.colors.primary : colors.accent,
      fontWeight: "600",
    },
    dashboardGrid: {
      flexDirection: "row",
      gap: spacing.large,
      paddingHorizontal: spacing.large,
    },
    dashboardColumn: {
      flex: 1,
    },
    contentCardTablet: {
      marginHorizontal: 0,
    },
    splitView: {
      flex: 1,
      flexDirection: "row",
    },
    splitViewSingle: {
      flex: 1,
    },
    splitViewDetail: {
      flex: 1,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    splitViewDetailHeader: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      paddingHorizontal: spacing.large,
      paddingBottom: spacing.small,
      backgroundColor: theme.colors.background,
    },
    splitViewDetailHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.medium,
    },
    splitViewDetailHeaderActions: {
      flexDirection: "row",
      gap: spacing.medium,
      alignItems: "center",
      flex: 1,
    },
    splitViewDetailHeaderButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.small,
      paddingVertical: spacing.small,
      paddingHorizontal: spacing.medium,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: isEinkMode ? theme.colors.primary : colors.accent,
      backgroundColor: theme.colors.card,
      overflow: "hidden",
    },
    splitViewDetailHeaderButtonLiquidGlass: {
      borderColor: "rgba(255,255,255,0.18)",
      backgroundColor: "transparent",
    },
    splitViewDetailHeaderButtonGlass: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    splitViewDetailCloseButton: {
      width: 40,
      height: 40,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    splitViewDetailCloseButtonLiquidGlass: {
      borderColor: "rgba(255,255,255,0.18)",
      backgroundColor: "transparent",
    },
    splitViewDetailHeaderButtonText: {
      ...body,
      color: isEinkMode ? theme.colors.primary : colors.accent,
      fontWeight: "600",
    },
  });
