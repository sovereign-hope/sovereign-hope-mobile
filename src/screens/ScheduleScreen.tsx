import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { WebView } from "react-native-webview";

type Props = NativeStackScreenProps<RootStackParamList, "Schedule">;

export const ScheduleScreen: React.FunctionComponent<Props> = ({
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
    <SafeAreaView edges={["left", "right"]}>
      <WebView source={{ uri: "https://sovereignhope.church/events" }} />
    </SafeAreaView>
  );
};
