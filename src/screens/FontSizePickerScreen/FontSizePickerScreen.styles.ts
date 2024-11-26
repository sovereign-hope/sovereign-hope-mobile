import { StyleSheet, ViewStyle, TextStyle } from "react-native";
import { spacing } from "src/style/layout";
import { header1, header2, header3 } from "src/style/typography";
import { Theme } from "@react-navigation/native";
import { colors } from "src/style/colors";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  settingsSectionHeader: TextStyle;
  settingsRow: ViewStyle;
  settingsRowText: TextStyle;
  settingsRowValueContainer: ViewStyle;
  disclosureIcon: ViewStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      flex: 1,
      paddingTop: 0,
      backgroundColor: theme.colors.background,
    },
    settingsSectionHeader: {
      ...header3,
      margin: spacing.large,
      color: theme.colors.text,
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
    settingsRowText: {
      color: theme.colors.text,
    },
    settingsRowValueContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    disclosureIcon: {
      marginLeft: spacing.large,
    },
  });
