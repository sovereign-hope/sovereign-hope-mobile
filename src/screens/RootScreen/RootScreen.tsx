import React from "react";
import { useColorScheme } from "react-native";
import { ReadingPlanScreen } from "src/screens/ReadingPlanScreen/ReadingPlanScreen";
import { NavigationContainer } from "@react-navigation/native";
import { lightTheme, darkTheme } from "src/style/themes";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { enableScreens } from "react-native-screens";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { accent } from "src/style/colors";

// React Navigation configuration
enableScreens();
const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootScreen = (): JSX.Element => {
  const colorScheme = useColorScheme();

  return (
    <NavigationContainer
      theme={colorScheme === "dark" ? darkTheme : lightTheme}
    >
      <Stack.Navigator
        screenOptions={{
          headerTintColor: accent,
          headerShadowVisible: false,
          headerTitleStyle: {
            color:
              colorScheme === "dark"
                ? darkTheme.colors.text
                : lightTheme.colors.text,
          },
        }}
      >
        <Stack.Screen name="Reading Plan" component={ReadingPlanScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
