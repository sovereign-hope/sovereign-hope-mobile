import * as React from "react";
import { SafeAreaView, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { elementSize } from "src/style/layout";
import { text } from "src/style/colors";
import { useTheme } from "@react-navigation/native";
import { styles } from "./NoNetworkComponent.styles";

export const NoNetworkComponent: React.FunctionComponent = () => {
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
        No internet connection. Please check your connection and try again.
      </Text>
    </SafeAreaView>
  );
};
