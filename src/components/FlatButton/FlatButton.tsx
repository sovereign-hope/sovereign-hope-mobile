import * as React from "react";
import { Pressable, Text, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { elementSize } from "src/style/layout";
import { text } from "src/style/colors";
import { useTheme } from "@react-navigation/native";
import { styles } from "./FlatButton.styles";
import {
  getDisabledFeedbackStyle,
  getPressFeedbackStyle,
} from "src/style/eink";

interface ButtonProps {
  title: string;
  disabled?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
  isEinkMode?: boolean;
}

export const FlatButton: React.FunctionComponent<ButtonProps> = ({
  title,
  disabled,
  onPress,
  style,
  icon,
  isEinkMode = false,
}: ButtonProps) => {
  const theme = useTheme();
  const themedStyles = styles({ theme, isEinkMode });

  return (
    <Pressable
      style={({ pressed }) => ({
        ...themedStyles.button,
        ...style,
        ...getPressFeedbackStyle(pressed, isEinkMode, {
          pressedOpacity: 0.6,
        }),
        ...getDisabledFeedbackStyle(Boolean(disabled), isEinkMode, {
          disabledOpacity: 0.6,
        }),
      })}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={elementSize.tiny}
          color={isEinkMode ? theme.colors.primary : text.light}
          style={themedStyles.icon}
        />
      )}
      <Text style={themedStyles.text}>{title}</Text>
    </Pressable>
  );
};
