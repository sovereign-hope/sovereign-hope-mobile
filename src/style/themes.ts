import { DefaultTheme, DarkTheme } from "@react-navigation/native";
import { colors } from "./colors";

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.black,
    text: colors.darkGrey,
  },
};

export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.white,
    text: colors.white,
    border: colors.grey2,
    card: colors.darkerGrey,
  },
};

export const einkTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.black,
    background: colors.white,
    card: colors.white,
    text: colors.black,
    border: colors.black,
    notification: colors.black,
  },
};

export const einkDarkTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: colors.white,
    background: colors.black,
    card: colors.black,
    text: colors.white,
    border: colors.white,
    notification: colors.white,
  },
};
