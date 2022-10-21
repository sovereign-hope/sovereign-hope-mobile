import React from "react";
import { useColorScheme } from "src/hooks/useColorScheme";
import { ReadingPlanScreen } from "src/screens/ReadingPlanScreen/ReadingPlanScreen";
import { NavigationContainer } from "@react-navigation/native";
import { lightTheme, darkTheme } from "src/style/themes";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { enableScreens } from "react-native-screens";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { colors } from "src/style/colors";
import { TodayScreen } from "../TodayScreen/TodayScreen";
import { ReadScreen } from "../ReadScreen/ReadScreen";

// React Navigation configuration
enableScreens();
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootStackParamList>();

const HomeScreen = (): JSX.Element => (
  <Tab.Navigator>
    <Tab.Screen
      name="Today"
      component={TodayScreen}
      options={{
        headerShown: false,
        // eslint-disable-next-line react/display-name
        tabBarIcon: ({
          focused,
          color,
          size,
        }: {
          focused: boolean;
          color: string;
          size: number;
        }) => (
          <Ionicons
            name="today"
            size={size}
            color={focused ? colors.accent : color}
          />
        ),
      }}
    />
    <Tab.Screen
      name="Reading Plan"
      component={ReadingPlanScreen}
      options={{
        lazy: false,
        // eslint-disable-next-line react/display-name
        tabBarIcon: ({
          focused,
          color,
          size,
        }: {
          focused: boolean;
          color: string;
          size: number;
        }) => (
          <Ionicons
            name="ios-book"
            size={size}
            color={focused ? colors.accent : color}
          />
        ),
      }}
    />
  </Tab.Navigator>
);

export const RootScreen = (): JSX.Element => {
  const colorScheme = useColorScheme();

  return (
    <NavigationContainer
      theme={colorScheme === "dark" ? darkTheme : lightTheme}
    >
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          headerTitleStyle: {
            color:
              colorScheme === "dark"
                ? darkTheme.colors.text
                : lightTheme.colors.text,
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Read" component={ReadScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
