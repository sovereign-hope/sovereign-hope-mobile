import * as React from "react";
import { SafeAreaView, Text } from "react-native";
import { useIntl } from "react-intl";
import { Ionicons } from "@expo/vector-icons";
import { elementSize } from "src/style/layout";
import { text } from "src/style/colors";
import { useTheme } from "@react-navigation/native";
import { messages } from "./NoNetworkComponent.messages";
import { styles } from "./NoNetworkComponent.styles";

export const NoNetworkComponent: React.FunctionComponent = () => {
  const intl = useIntl();
  const theme = useTheme();
  const themedStyles = styles({ theme });

  return (
    <SafeAreaView style={themedStyles.screen}>
      <Ionicons
        name="cloud-offline"
        size={elementSize.small}
        color={text.dark}
      />
      <Text style={themedStyles.headerText}>
        {intl.formatMessage(messages.header)}
      </Text>
    </SafeAreaView>
  );
};
