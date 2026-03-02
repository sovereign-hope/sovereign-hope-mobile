import { ViewStyle } from "react-native";
import { colors } from "src/style/colors";

interface PressFeedbackOptions {
  pressedOpacity?: number;
  isDarkMode?: boolean;
}

export const getPressFeedbackStyle = (
  pressed: boolean,
  isEinkMode: boolean,
  options?: PressFeedbackOptions
): ViewStyle | undefined => {
  if (!pressed) {
    return;
  }

  const { pressedOpacity = 0.7, isDarkMode = false } = options ?? {};

  if (isEinkMode) {
    return {
      backgroundColor: isDarkMode ? colors.darkGrey : colors.grey0,
      borderColor: isDarkMode ? colors.white : colors.black,
    };
  }

  return { opacity: pressedOpacity };
};

interface DisabledFeedbackOptions {
  disabledOpacity?: number;
  isDarkMode?: boolean;
}

export const getDisabledFeedbackStyle = (
  disabled: boolean,
  isEinkMode: boolean,
  options?: DisabledFeedbackOptions
): ViewStyle | undefined => {
  if (!disabled) {
    return;
  }

  const { disabledOpacity = 0.4, isDarkMode = false } = options ?? {};

  if (isEinkMode) {
    return {
      backgroundColor: isDarkMode ? colors.darkGrey : colors.grey0,
    };
  }

  return { opacity: disabledOpacity };
};
