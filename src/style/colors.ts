export const colors = {
  grey0: "#F1F1F1",
  grey: "#8E8E93",
  grey2: "#555555",
  black: "#000000",
  darkGrey: "#333333",
  darkerGrey: "#222222",
  white: "#FFFFFF",
  green: "#6CA64B",
  red: "#C94B41",
  mint: "#A6F4CC",
  blue: "#187AC6",
  accent: "#BA8748",
};

export const background = {
  dark: colors.darkGrey,
  light: colors.white,
};

export const navigation = {
  dark: "#2A2A2A", // Between darkGrey (#333333) and darkerGrey (#222222)
  light: "#F8F8F8", // Between white (#FFFFFF) and a slightly darker tone
} as const;

export const text = {
  dark: colors.darkGrey,
  light: colors.white,
};
