import { TextStyle } from "react-native";
import { elementSize, radius, spacing } from "src/style/layout";
import { Theme } from "@react-navigation/native";

type Props = {
  theme: Theme;
};

export const TextInputStyle = ({ theme }: Props): TextStyle => ({
  borderColor: theme.colors.border,
  width: "100%",
  borderWidth: 1,
  borderRadius: radius.medium,
  minHeight: elementSize.small,
  paddingVertical: spacing.medium,
  paddingHorizontal: spacing.large,
  color: theme.colors.text,
  backgroundColor: theme.colors.card,
});
