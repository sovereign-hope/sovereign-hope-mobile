import React, { useEffect } from "react";
import { useColorScheme } from "src/hooks/useColorScheme";
import { ReadingPlanScreen } from "src/screens/ReadingPlanScreen/ReadingPlanScreen";
import { NavigationContainer, useFocusEffect } from "@react-navigation/native";
import { lightTheme, darkTheme } from "src/style/themes";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeBottomTabNavigator } from "@react-navigation/bottom-tabs/unstable";
import { enableScreens } from "react-native-screens";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { colors, navigation as navigationColors } from "src/style/colors";
import { TodayScreen } from "../TodayScreen/TodayScreen";
import { ReadScreen } from "../ReadScreen/ReadScreen";
import { SettingsScreen } from "../SettingsScreen/SettingsScreen";
import { AccountSignInScreen } from "../AccountSignInScreen/AccountSignInScreen";
import { PodcastScreen } from "../PodcastScreen/PodcastScreen";
import { SelectPlanScreen } from "../SelectPlanScreen/SelectPlanScreen";
import { FontSizePickerScreen } from "../FontSizePickerScreen/FontSizePickerScreen";
import { ScheduleScreen } from "../ScheduleScreen";
import { SundaysScreen } from "../SundaysScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, Platform, Linking, Text, View } from "react-native";
import { TabBarHeightContext } from "src/navigation/TabBarContext";
import { ChurchScreen } from "../ChurchScreen/ChurchScreen";
import { useAppSelector, useAppDispatch } from "src/hooks/store";
import {
  selectEnableChurchCenterDeepLink,
  getEnableChurchCenterDeepLink,
} from "src/redux/settingsSlice";
import { selectIsMember } from "src/redux/authSlice";
import { MemberDirectoryScreen } from "../MemberDirectoryScreen/MemberDirectoryScreen";
import { DailyPrayerScreen } from "../DailyPrayerScreen/DailyPrayerScreen";

// React Navigation configuration
enableScreens();
const Stack = createNativeStackNavigator<RootStackParamList>();
const NativeTab = createNativeBottomTabNavigator<RootStackParamList>();
const JSTab = createBottomTabNavigator<RootStackParamList>();

const isIOS26OrNewer = (): boolean => {
  return (
    Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26
  );
};

const getHeaderBackgroundColor = (
  colorScheme: "light" | "dark"
): string | undefined => {
  if (isIOS26OrNewer()) {
    return;
  }

  return colorScheme === "dark"
    ? navigationColors.dark
    : navigationColors.light;
};

const getNativeTabIcon = (iosSymbol: string) => ({
  type: "sfSymbol" as const,
  name: iosSymbol as never,
});

const PodcastStack = (): React.JSX.Element => {
  const colorScheme = useColorScheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.accent,
        headerShadowVisible: false,
        headerLargeTitle: true,
        ...(Platform.OS === "ios"
          ? {
              headerBackButtonDisplayMode: "minimal" as const,
              headerBackTitleVisible: false,
            }
          : {}),
        headerStyle: {
          backgroundColor: getHeaderBackgroundColor(colorScheme),
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

const WeekStack = (): React.JSX.Element => {
  const colorScheme = useColorScheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.accent,
        headerShadowVisible: false,
        headerLargeTitle: true,
        ...(Platform.OS === "ios"
          ? {
              headerBackButtonDisplayMode: "minimal" as const,
              headerBackTitleVisible: false,
            }
          : {}),
        headerStyle: {
          backgroundColor: getHeaderBackgroundColor(colorScheme),
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
        options={({ navigation }) => {
          if (isIOS26OrNewer()) {
            return {
              unstable_headerRightItems: () => [
                {
                  type: "button" as const,
                  label: "Settings",
                  icon: {
                    type: "sfSymbol" as const,
                    name: "gearshape" as never,
                  },
                  onPress: () => navigation.navigate("Settings"),
                  tintColor: colors.accent,
                  sharesBackground: false,
                },
              ],
            };
          }

          return {
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
          };
        }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="Account Sign In"
        component={AccountSignInScreen}
        options={{ title: "Sign In", headerLargeTitle: false }}
      />
    </Stack.Navigator>
  );
};

const ChurchStack = (): React.JSX.Element => {
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

const ReadingPlanStack = (): React.JSX.Element => {
  const colorScheme = useColorScheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.accent,
        headerShadowVisible: false,
        headerLargeTitle: true,
        headerStyle: {
          backgroundColor: getHeaderBackgroundColor(colorScheme),
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

const MemberAccessGuardScreen = (): React.JSX.Element => {
  const colorScheme = useColorScheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor:
          colorScheme === "dark"
            ? darkTheme.colors.background
            : lightTheme.colors.background,
      }}
    >
      <Text
        style={{
          textAlign: "center",
          color:
            colorScheme === "dark"
              ? darkTheme.colors.text
              : lightTheme.colors.text,
        }}
      >
        This feature is available to church members.
      </Text>
    </View>
  );
};

const MemberStack = (): React.JSX.Element => {
  const colorScheme = useColorScheme();
  const isMember = useAppSelector(selectIsMember);

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.accent,
        headerShadowVisible: false,
        headerLargeTitle: true,
        ...(Platform.OS === "ios"
          ? {
              headerBackButtonDisplayMode: "minimal" as const,
              headerBackTitleVisible: false,
            }
          : {}),
        headerStyle: {
          backgroundColor: getHeaderBackgroundColor(colorScheme),
        },
        headerTitleStyle: {
          color:
            colorScheme === "dark"
              ? darkTheme.colors.text
              : lightTheme.colors.text,
        },
      }}
    >
      {isMember ? (
        <>
          <Stack.Screen
            name="Member Directory"
            component={MemberDirectoryScreen}
            options={({ navigation }) => {
              if (isIOS26OrNewer()) {
                return {
                  unstable_headerRightItems: () => [
                    {
                      type: "button" as const,
                      label: "Daily Prayer",
                      onPress: () => navigation.navigate("Daily Prayer"),
                      tintColor: colors.accent,
                      sharesBackground: false,
                    },
                  ],
                };
              }

              return {
                headerRight: () => (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => navigation.navigate("Daily Prayer")}
                    style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
                  >
                    <Text style={{ color: colors.accent, fontWeight: "600" }}>
                      Daily Prayer
                    </Text>
                  </Pressable>
                ),
              };
            }}
          />
          <Stack.Screen
            name="Daily Prayer"
            component={DailyPrayerScreen}
            options={{ headerLargeTitle: false }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Members"
          component={MemberAccessGuardScreen}
          options={{ headerLargeTitle: false }}
        />
      )}
    </Stack.Navigator>
  );
};

const HomeScreen = (): React.JSX.Element => {
  const colorScheme = useColorScheme();
  const dispatch = useAppDispatch();
  const isMember = useAppSelector(selectIsMember);
  const enableChurchCenterDeepLink = useAppSelector(
    selectEnableChurchCenterDeepLink
  );
  const { setHeight, setMeasuredHeight, setCachedHeight, setIsCached } =
    React.useContext(TabBarHeightContext);
  const insets = useSafeAreaInsets();

  const estimatedTabBarHeight =
    (Platform.OS === "ios" ? 49 : 56) + insets.bottom;

  const updateTabBarHeight = React.useCallback(() => {
    setMeasuredHeight(estimatedTabBarHeight);
    setHeight(estimatedTabBarHeight);
    setCachedHeight(estimatedTabBarHeight);
    setIsCached(true);
  }, [
    estimatedTabBarHeight,
    setCachedHeight,
    setHeight,
    setIsCached,
    setMeasuredHeight,
  ]);

  // Load settings on app startup
  useEffect(() => {
    void dispatch(getEnableChurchCenterDeepLink());
  }, [dispatch]);

  useEffect(() => {
    updateTabBarHeight();
  }, [updateTabBarHeight]);

  useFocusEffect(
    React.useCallback(() => {
      updateTabBarHeight();
      return;
    }, [updateTabBarHeight])
  );

  // Reset tab bar height when leaving the tab navigator
  useEffect(() => {
    return () => {
      setHeight(0);
    };
  }, [setHeight]);

  if (Platform.OS === "ios") {
    return (
      <NativeTab.Navigator
        initialRouteName="This Week"
        screenOptions={{
          tabBarActiveTintColor: colors.accent,
          tabBarStyle: {
            backgroundColor: isIOS26OrNewer()
              ? undefined
              : colorScheme === "dark"
              ? navigationColors.dark
              : navigationColors.light,
          },
        }}
      >
        <NativeTab.Screen
          name="This Week"
          component={WeekStack}
          options={{
            headerShown: false,
            tabBarLabel: "This Week",
            tabBarIcon: getNativeTabIcon("calendar"),
          }}
        />
        <NativeTab.Screen
          name="Reading Plan"
          component={ReadingPlanStack}
          options={{
            lazy: false,
            headerShown: false,
            tabBarLabel: "Reading",
            tabBarIcon: getNativeTabIcon("book"),
          }}
        />
        <NativeTab.Screen
          name="Church"
          component={ChurchStack}
          options={{
            lazy: false,
            headerShown: false,
            tabBarLabel: "Church",
            tabBarIcon: getNativeTabIcon("house"),
          }}
          listeners={{
            tabPress: () => {
              if (!enableChurchCenterDeepLink) {
                return;
              }

              const churchCenterUrl = "https://churchcenter.com/home";
              void Linking.canOpenURL(churchCenterUrl)
                .then((canOpen) => {
                  if (canOpen) {
                    return Linking.openURL(churchCenterUrl);
                  }

                  return;
                })
                .catch(() => {});
            },
          }}
        />
        {isMember ? (
          <NativeTab.Screen
            name="Members"
            component={MemberStack}
            options={{
              lazy: false,
              headerShown: false,
              tabBarLabel: "Members",
              tabBarIcon: getNativeTabIcon("person.3"),
            }}
          />
        ) : undefined}
        <NativeTab.Screen
          name="Resources"
          component={PodcastStack}
          options={{
            lazy: false,
            headerShown: false,
            tabBarLabel: "Resources",
            tabBarIcon: getNativeTabIcon("bookmark"),
          }}
        />
      </NativeTab.Navigator>
    );
  }

  return (
    <JSTab.Navigator
      initialRouteName="This Week"
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor:
          colorScheme === "dark"
            ? darkTheme.colors.text
            : lightTheme.colors.text,
        tabBarStyle: {
          backgroundColor:
            colorScheme === "dark"
              ? navigationColors.dark
              : navigationColors.light,
        },
      }}
    >
      <JSTab.Screen
        name="This Week"
        component={WeekStack}
        options={{
          headerShown: false,
          tabBarLabel: "This Week",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <JSTab.Screen
        name="Reading Plan"
        component={ReadingPlanStack}
        options={{
          lazy: false,
          headerShown: false,
          tabBarLabel: "Reading",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <JSTab.Screen
        name="Church"
        component={ChurchStack}
        options={{
          lazy: false,
          headerShown: false,
          tabBarLabel: "Church",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      {isMember ? (
        <JSTab.Screen
          name="Members"
          component={MemberStack}
          options={{
            lazy: false,
            headerShown: false,
            tabBarLabel: "Members",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
      ) : undefined}
      <JSTab.Screen
        name="Resources"
        component={PodcastStack}
        options={{
          lazy: false,
          headerShown: false,
          tabBarLabel: "Resources",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark" size={size} color={color} />
          ),
        }}
      />
    </JSTab.Navigator>
  );
};

export const RootScreen = (): React.JSX.Element => {
  const colorScheme = useColorScheme();
  const { setHeight, setIsTabBarVisible } =
    React.useContext(TabBarHeightContext);

  return (
    <NavigationContainer
      theme={colorScheme === "dark" ? darkTheme : lightTheme}
      onStateChange={(state) => {
        if (state) {
          const currentRoute = state.routes[state.index];
          if (currentRoute?.name === "Home") {
            // Don't set height here, let HomeScreen handle it
            setIsTabBarVisible(true);
          } else {
            setHeight(0);
            setIsTabBarVisible(false);
          }
        }
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: getHeaderBackgroundColor(colorScheme),
          },
          headerTitleStyle: {
            color:
              colorScheme === "dark"
                ? darkTheme.colors.text
                : lightTheme.colors.text,
          },
          ...(isIOS26OrNewer()
            ? { headerBackButtonDisplayMode: "minimal" as const }
            : {}),
          ...(Platform.OS === "android" ? { statusBarTranslucent: true } : {}),
          statusBarStyle: colorScheme === "dark" ? "light" : "dark",
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
  );
};
