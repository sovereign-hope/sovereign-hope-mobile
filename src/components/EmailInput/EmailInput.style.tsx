import { StyleSheet, TextStyle } from "react-native";
import { spacing } from "src/style/layout";
import { TextInputStyle } from "src/style/components/TextInput.styles";
import { Theme } from "@react-navigation/native";

type Props = {
  theme: Theme;
};

interface Style {
  input: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    input: {
      ...TextInputStyle({ theme }),
      marginBottom: spacing.medium,
    },
  });
