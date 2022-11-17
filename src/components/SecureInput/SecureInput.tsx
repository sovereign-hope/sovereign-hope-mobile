import React from "react";
import { TextInput, TextInputProps } from "react-native";
import { useTheme } from "@react-navigation/native";
import { styles } from "./SecureInput.style";

interface Props extends TextInputProps {
  onChangeText: (text: string) => void;
  value: string;
  placeholderMessage: string;
}

export const SecureInput: React.ForwardRefExoticComponent<
  Props & React.RefAttributes<TextInput>
> = React.forwardRef<TextInput, Props>(function SecureInput(
  { onChangeText, value, placeholderMessage, ...rest }: Props,
  ref
) {
  const theme = useTheme();
  const themedStyles = styles({ theme });

  return (
    <TextInput
      style={themedStyles.input}
      onChangeText={onChangeText}
      value={value}
      placeholder={placeholderMessage}
      autoComplete="password"
      secureTextEntry
      autoCapitalize="none"
      autoCorrect={false}
      ref={ref}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...rest}
    />
  );
});
