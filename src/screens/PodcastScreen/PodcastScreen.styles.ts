import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { radius, spacing } from "src/style/layout";
import { body, header2, header3 } from "src/style/typography";
import { colors } from "src/style/colors";
import { Theme } from "@react-navigation/native";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  list: ViewStyle;
  disclosureIcon: ViewStyle;
  subscribeButton: ViewStyle;
  headerRow: ViewStyle;
  textButton: TextStyle;
  contentCard: ViewStyle;
  contentCardColumn: ViewStyle;
  contentCardHeader: TextStyle;
  header: TextStyle;
  image: ImageStyle;
  text: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      paddingTop: 0,
      backgroundColor: theme.colors.background,
      justifyContent: "center",
    },
    list: {},
    disclosureIcon: {
      marginLeft: spacing.medium,
    },
    subscribeButton: {
      margin: spacing.large,
    },

    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginHorizontal: spacing.medium,
      alignItems: "center",
    },
    textButton: {
      ...body,
      color: colors.accent,
      margin: spacing.medium,
    },
    contentCard: {
      flexDirection: "row",
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
    header: {
      ...header2,
      margin: spacing.medium,
      color: theme.colors.text,
    },
    image: {
      width: 50,
      height: 50,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: radius.medium,
      marginRight: spacing.medium,
    },
    text: {
      ...body,
      color: theme.colors.text,
    },
  });
