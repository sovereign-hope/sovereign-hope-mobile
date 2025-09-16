import React, { useEffect } from "react";
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
import { SettingsScreen } from "../SettingsScreen/SettingsScreen";
import { PodcastScreen } from "../PodcastScreen/PodcastScreen";
import { SelectPlanScreen } from "../SelectPlanScreen/SelectPlanScreen";
import { FontSizePickerScreen } from "../FontSizePickerScreen/FontSizePickerScreen";
import { ScheduleScreen } from "../ScheduleScreen";
import { SundaysScreen } from "../SundaysScreen";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, Platform, Linking } from "react-native";
import { ChurchScreen } from "../ChurchScreen/ChurchScreen";
import { useAppSelector, useAppDispatch } from "src/hooks/store";
import {
  selectEnableChurchCenterDeepLink,
  getEnableChurchCenterDeepLink,
} from "src/redux/settingsSlice";

// React Navigation configuration
enableScreens();
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootStackParamList>();

// Removed SettingsStack; Settings now lives inside WeekStack

const PodcastStack = (): JSX.Element => {
  const colorScheme = useColorScheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.accent,
        headerShadowVisible: false,
        headerLargeTitle: true,
        headerStyle: {
          backgroundColor: colorScheme === "dark" ? "#2A2A2A" : "#F8F8F8",
        },
        headerTitleStyle: {
          color:
            colorScheme === "dark"
              ? darkTheme.colors.text
              : lightTheme.colors.text,
        },
      }}
    >
      <Stack.Screen name="Resources" component={PodcastScreen} />
    </Stack.Navigator>
  );
};

const WeekStack = (): JSX.Element => {
  const colorScheme = useColorScheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.accent,
        headerShadowVisible: false,
        headerLargeTitle: true,
        headerStyle: {
          backgroundColor: colorScheme === "dark" ? "#2A2A2A" : "#F8F8F8",
        },
        headerTitleStyle: {
          color:
            colorScheme === "dark"
              ? darkTheme.colors.text
              : lightTheme.colors.text,
        },
      }}
    >
      <Stack.Screen
        name="This Week"
        component={TodayScreen}
        options={({ navigation }) => ({
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              accessibilityRole="button"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="cog" size={24} color={colors.accent} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

const ChurchStack = (): JSX.Element => {
  const colorScheme = useColorScheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Church" component={ChurchScreen} />
    </Stack.Navigator>
  );
};

const ReadingPlanStack = (): JSX.Element => {
  const colorScheme = useColorScheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.accent,
        headerShadowVisible: false,
        headerLargeTitle: true,
        headerStyle: {
          backgroundColor: colorScheme === "dark" ? "#2A2A2A" : "#F8F8F8",
        },
        headerTitleStyle: {
          color:
            colorScheme === "dark"
              ? darkTheme.colors.text
              : lightTheme.colors.text,
        },
      }}
    >
      <Stack.Screen
        name="Reading Plan"
        component={ReadingPlanScreen}
        options={{ headerLargeTitle: false }}
      />
    </Stack.Navigator>
  );
};

// Custom Church tab button component
const ChurchTabButton = (props: any) => {
  const enableChurchCenterDeepLink = useAppSelector(
    selectEnableChurchCenterDeepLink
  );

  const handlePress = () => {
    // Only try to open Church Center app on iOS if setting is enabled
    if (Platform.OS === "ios" && enableChurchCenterDeepLink) {
      const churchCenterUrl = "https://churchcenter.com/home";
      console.log(`Attempting to open Church Center URL: ${churchCenterUrl}`);

      // First, check if the URL can be opened
      Linking.canOpenURL(churchCenterUrl)
        .then((canOpen) => {
          if (canOpen) {
            // Use a small delay to ensure the UI is ready
            setTimeout(() => {
              Linking.openURL(churchCenterUrl)
                .then(() => {
                  console.log("Successfully opened Church Center app");
                  // If successful, don't switch tabs - stay on current tab
                  return;
                })
                .catch((openError) => {
                  console.log(
                    "Error opening Church Center app after canOpen check:",
                    openError
                  );
                  // Fall through to normal tab behavior
                  if (typeof props.onPress === "function") {
                    props.onPress();
                  }
                });
            }, 100);
          } else {
            console.log(
              "Cannot open Church Center URL, falling back to WebView"
            );
            // Fall through to normal tab behavior
            if (typeof props.onPress === "function") {
              props.onPress();
            }
          }
        })
        .catch((error) => {
          console.log("Error checking Church Center app availability:", error);
          // If error, fall through to normal tab behavior
          if (typeof props.onPress === "function") {
            props.onPress();
          }
        });
      return;
    }

    // If not iOS, not enabled, or error occurred, switch to Church tab normally
    if (typeof props.onPress === "function") {
      props.onPress();
    }
  };

  return (
    <Pressable {...props} onPress={handlePress}>
      {props.children}
    </Pressable>
  );
};

const HomeScreen = (): JSX.Element => {
  const colorScheme = useColorScheme();
  const dispatch = useAppDispatch();

  // Load settings on app startup
  useEffect(() => {
    dispatch(getEnableChurchCenterDeepLink());
  }, [dispatch]);

  return (
    <Tab.Navigator
      initialRouteName="This Week"
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colorScheme === "dark" ? "#2A2A2A" : "#F8F8F8",
        },
      }}
    >
      <Tab.Screen
        name="This Week"
        component={WeekStack}
        options={{
          headerShown: false,

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
        component={ReadingPlanStack}
        options={{
          lazy: false,
          headerShown: false,
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
              name="book"
              size={size}
              color={focused ? colors.accent : color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Church"
        component={ChurchStack}
        options={{
          lazy: false,
          headerShown: false,
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
              name="home"
              size={size}
              color={focused ? colors.accent : color}
            />
          ),
          tabBarButton: ChurchTabButton,
        }}
      />
      <Tab.Screen
        name="Resources"
        component={PodcastStack}
        options={{
          lazy: false,
          headerShown: false,

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
              name="bookmarks"
              size={size}
              color={focused ? colors.accent : color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const RootScreen = (): JSX.Element => {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaView
      edges={["top"]}
      style={{
        flex: 1,
        backgroundColor: colorScheme === "dark" ? "#2A2A2A" : "#F8F8F8",
      }}
    >
      <NavigationContainer
        theme={colorScheme === "dark" ? darkTheme : lightTheme}
      >
        <Stack.Navigator
          screenOptions={{
            headerTintColor: colors.accent,
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: colorScheme === "dark" ? "#2A2A2A" : "#F8F8F8",
            },
            headerTitleStyle: {
              color:
                colorScheme === "dark"
                  ? darkTheme.colors.text
                  : lightTheme.colors.text,
            },
            statusBarTranslucent: true,
            statusBarStyle: colorScheme === "dark" ? "light" : "dark",
            statusBarBackgroundColor:
              colorScheme === "dark" ? "#2A2A2A" : "#F8F8F8",
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Read" component={ReadScreen} />
          <Stack.Screen name="Available Plans" component={SelectPlanScreen} />
          <Stack.Screen name="Font Size" component={FontSizePickerScreen} />
          <Stack.Screen name="Schedule" component={ScheduleScreen} />
          <Stack.Screen name="Sundays" component={SundaysScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
};
