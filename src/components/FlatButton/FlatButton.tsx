import * as React from "react";
import { Pressable, Text, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { elementSize } from "src/style/layout";
import { text } from "src/style/colors";
import { useTheme } from "@react-navigation/native";
import { styles } from "./FlatButton.styles";

interface ButtonProps {
  title: string;
  disabled?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const FlatButton: React.FunctionComponent<ButtonProps> = ({
  title,
  disabled,
  onPress,
  style,
  icon,
}: ButtonProps) => {
  const theme = useTheme();
  const themedStyles = styles({ theme });

  return (
    <Pressable
      style={({ pressed }) => ({
        ...themedStyles.button,
        ...style,
        opacity: pressed || disabled ? 0.6 : 1,
      })}
      onPress={onPress}
      disabled={disabled}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={elementSize.tiny}
          color={text.light}
          style={themedStyles.icon}
        />
      )}
      <Text style={themedStyles.text}>{title}</Text>
    </Pressable>
  );
};

FlatButton.defaultProps = {
  style: {},
  disabled: false,
  icon: undefined,
};
