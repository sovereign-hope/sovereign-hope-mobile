import { ViewStyle } from "react-native";
import { colors } from "src/style/colors";

export const getPressFeedbackStyle = (
  pressed: boolean,
  isEinkMode: boolean,
  pressedOpacity = 0.7,
  isDarkMode = false
): ViewStyle | undefined => {
  if (!pressed) {
    return;
  }

  if (isEinkMode) {
    return {
      backgroundColor: isDarkMode ? colors.darkGrey : colors.grey0,
      borderColor: isDarkMode ? colors.white : colors.black,
    };
  }

  return { opacity: pressedOpacity };
};

export const getDisabledFeedbackStyle = (
  disabled: boolean,
  isEinkMode: boolean,
  disabledOpacity = 0.4,
  isDarkMode = false
): ViewStyle | undefined => {
  if (!disabled) {
    return;
  }

  if (isEinkMode) {
    return {
      backgroundColor: isDarkMode ? colors.darkGrey : colors.grey0,
    };
  }

  return { opacity: disabledOpacity };
};
