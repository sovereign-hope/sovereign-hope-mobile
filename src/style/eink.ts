import { ViewStyle } from "react-native";
import { colors } from "src/style/colors";

export const getPressFeedbackStyle = (
  pressed: boolean,
  isEinkMode: boolean,
  pressedOpacity = 0.7
): ViewStyle | undefined => {
  if (!pressed) {
    return;
  }

  if (isEinkMode) {
    return {
      backgroundColor: colors.grey0,
      borderColor: colors.black,
    };
  }

  return { opacity: pressedOpacity };
};

export const getDisabledFeedbackStyle = (
  disabled: boolean,
  isEinkMode: boolean,
  disabledOpacity = 0.4
): ViewStyle | undefined => {
  if (!disabled) {
    return;
  }

  if (isEinkMode) {
    return {
      backgroundColor: colors.grey0,
    };
  }

  return { opacity: disabledOpacity };
};
