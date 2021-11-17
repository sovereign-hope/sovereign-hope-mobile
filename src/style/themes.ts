import { DefaultTheme, DarkTheme } from "@react-navigation/native";
import { colors } from "./colors";

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.black,
  },
};

export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.white,
  },
};
