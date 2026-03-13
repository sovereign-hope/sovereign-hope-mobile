import type { HighlightColor } from "src/types/highlights";

type ColorValues = {
  light: string;
  dark: string;
};

export const HIGHLIGHT_COLORS: Record<HighlightColor, ColorValues> = {
  yellow: { light: "#FFE08A", dark: "#78680A" },
  green: { light: "#B7F5C8", dark: "#1A5C2D" },
  blue: { light: "#BFDBFE", dark: "#1E3A5F" },
  pink: { light: "#FBCFE8", dark: "#7C2D5C" },
  orange: { light: "#FED7AA", dark: "#7C3A0A" },
};

export const HIGHLIGHT_COLOR_ORDER: HighlightColor[] = [
  "yellow",
  "green",
  "blue",
  "pink",
  "orange",
];

export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = "yellow";
