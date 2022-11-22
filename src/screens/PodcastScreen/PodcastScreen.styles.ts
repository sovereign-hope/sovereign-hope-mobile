import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { spacing } from "src/style/layout";
import { header3 } from "src/style/typography";
import { colors } from "src/style/colors";
import { Theme } from "@react-navigation/native";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  list: ViewStyle;
  listItem: ViewStyle;
  listItemContent: ViewStyle;
  listItemImage: ImageStyle;
  listItemTitle: TextStyle;
  listItemText: TextStyle;
  disclosureIcon: ViewStyle;
  subscribeButton: ViewStyle;
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
    listItem: {
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.large,
      backgroundColor: theme.colors.card,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
    },
    listItemContent: {
      flex: 1,
    },
    listItemImage: {
      width: 50,
      height: 50,
      marginRight: spacing.large,
    },
    listItemTitle: {
      ...header3,
      color: theme.colors.text,
    },
    listItemText: {
      color: theme.colors.text,
    },
    disclosureIcon: {
      marginLeft: spacing.large,
    },
    subscribeButton: {
      margin: spacing.large,
    },
  });
