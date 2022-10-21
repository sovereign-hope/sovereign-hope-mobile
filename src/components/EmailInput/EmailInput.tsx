import React from "react";
import { TextInput, TextInputProps } from "react-native";
import { useTheme } from "@react-navigation/native";
import { styles } from "./EmailInput.style";

interface Props extends TextInputProps {
  onChangeText: (text: string) => void;
  value: string;
  placeholderMessage: string;
}

export const EmailInput: React.FunctionComponent<Props> = ({
  onChangeText,
  value,
  placeholderMessage,
  ...rest
}: Props) => {
  const theme = useTheme();
  const themedStyles = styles({ theme });

  return (
    <TextInput
      style={themedStyles.input}
      onChangeText={onChangeText}
      value={value}
      placeholder={placeholderMessage}
      autoComplete="email"
      autoCapitalize="none"
      autoCorrect={false}
      autoFocus
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...rest}
    />
  );
};
