import React from "react";
import { TextInput, TextInputProps } from "react-native";
import { useIntl } from "react-intl";
import { MessageDescriptor } from "@formatjs/intl";
import { useTheme } from "@react-navigation/native";
import { styles } from "./SecureInput.style";

interface Props extends TextInputProps {
  onChangeText: (text: string) => void;
  value: string;
  placeholderMessage: MessageDescriptor;
}

export const SecureInput: React.ForwardRefExoticComponent<
  Props & React.RefAttributes<TextInput>
> = React.forwardRef<TextInput, Props>(
  ({ onChangeText, value, placeholderMessage, ...rest }: Props, ref) => {
    const intl = useIntl();
    const theme = useTheme();
    const themedStyles = styles({ theme });

    return (
      <TextInput
        style={themedStyles.input}
        onChangeText={onChangeText}
        value={value}
        placeholder={intl.formatMessage(placeholderMessage)}
        autoCompleteType="password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        ref={ref}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...rest}
      />
    );
  }
);
