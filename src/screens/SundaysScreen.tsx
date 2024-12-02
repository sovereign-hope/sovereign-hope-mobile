import React from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { WebView } from "react-native-webview";

type Props = NativeStackScreenProps<RootStackParamList, "Sundays">;

export const SundaysScreen: React.FunctionComponent<Props> = ({
  navigation,
}: Props) => {
  // Custom hooks
  // const theme = useTheme();

  // Ref Hooks

  // State hooks

  // Callback hooks

  // Effect hooks

  // Event handlers

  // Constants
  // const themedStyles = styles({ theme });

  return (
    <WebView
      source={{ uri: "https://sovereignhope.church/watch-live" }}
      style={{ flex: 1 }}
    />
  );
};
