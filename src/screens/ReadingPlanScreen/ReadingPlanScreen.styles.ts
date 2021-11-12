import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";
import { spacing, elementSize } from "src/style/layout";
import { header1, header3 } from "src/style/typography";
import { Theme } from "@react-navigation/native";

type Props = {
  theme: Theme;
};

interface Style {
  screen: ViewStyle;
  imageContainer: ViewStyle;
  headerImage: ImageStyle;
  headerText: TextStyle;
  infoText: TextStyle;
  buttonContainer: ViewStyle;
  button: ViewStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    screen: {
      alignItems: "center",
      flex: 1,
    },
    imageContainer: {
      flex: 1,
      justifyContent: "center",
    },
    headerImage: {
      resizeMode: "contain",
      height: "80%",
      maxHeight: 250,
      marginVertical: spacing.extraLarge,
    },
    headerText: {
      ...header1,
      color: theme.colors.text,
    },
    infoText: {
      ...header3,
      margin: spacing.large,
      textAlign: "center",
      color: theme.colors.text,
    },
    buttonContainer: {
      justifyContent: "flex-end",
      width: "100%",
      padding: spacing.large,
    },
    button: {
      width: "100%",
      marginBottom: spacing.medium,
      height: elementSize.small,
    },
  });
