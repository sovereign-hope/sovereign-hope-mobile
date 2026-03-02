import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { radius, spacing } from "src/style/layout";
import { body, header2, header3 } from "src/style/typography";
import { colors } from "src/style/colors";
import { Theme } from "@react-navigation/native";

type Props = {
  theme: Theme;
  isEinkMode?: boolean;
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

export const styles = ({ theme, isEinkMode = false }: Props): Style =>
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
      color: isEinkMode ? theme.colors.primary : colors.accent,
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
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: theme.colors.border,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: isEinkMode ? 0 : 0.1,
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
