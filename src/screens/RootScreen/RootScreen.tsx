import React, { useEffect } from "react";
import { useColorScheme } from "src/hooks/useColorScheme";
import { ReadingPlanScreen } from "src/screens/ReadingPlanScreen/ReadingPlanScreen";
import { NavigationContainer, useFocusEffect } from "@react-navigation/native";
import { lightTheme, darkTheme, einkTheme } from "src/style/themes";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
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
import { AmbientSoundPickerScreen } from "../AmbientSoundPickerScreen/AmbientSoundPickerScreen";
import { ScheduleScreen } from "../ScheduleScreen";
import { SundaysScreen } from "../SundaysScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Pressable,
  Platform,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { TabBarHeightContext } from "src/navigation/TabBarContext";
import { ChurchScreen } from "../ChurchScreen/ChurchScreen";
import { useAppSelector, useAppDispatch } from "src/hooks/store";
import {
  selectEnableChurchCenterDeepLink,
  getEnableChurchCenterDeepLink,
  getEnableEinkMode,
  storeEnableEinkMode,
} from "src/redux/settingsSlice";
import { selectIsMember } from "src/redux/authSlice";
import { MemberDirectoryScreen } from "../MemberDirectoryScreen/MemberDirectoryScreen";
import { DailyPrayerScreen } from "../DailyPrayerScreen/DailyPrayerScreen";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { getPressFeedbackStyle } from "src/style/eink";
import { useTabletLayout } from "src/hooks/useTabletLayout";
import { spacing, radius } from "src/style/layout";
import { maybeAutoEnableEinkMode } from "src/services/einkDetection";

// React Navigation configuration
enableScreens();
const Stack = createNativeStackNavigator<RootStackParamList>();
const SettingsFlowStack = createNativeStackNavigator<RootStackParamList>();
const NativeTab = createNativeBottomTabNavigator<RootStackParamList>();
const JSTab = createBottomTabNavigator<RootStackParamList>();

const isIOS26OrNewer = (): boolean => {
  return (
    Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26
  );
};

const getActionColor = (isEinkMode: boolean): string =>
  isEinkMode ? colors.black : colors.accent;

const getDoneButtonOptions = (
  onPress: () => void,
  isEinkMode: boolean,
  actionColor: string
): Record<string, unknown> => {
  if (isIOS26OrNewer()) {
    return {
      unstable_headerRightItems: () => [
        {
          type: "button" as const,
          label: "Done",
          onPress,
          tintColor: actionColor,
          sharesBackground: false,
        },
      ],
    };
  }

  return {
    headerRight: () => (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          { paddingHorizontal: 4 },
          getPressFeedbackStyle(pressed, isEinkMode, 0.65),
        ]}
      >
        <Text style={{ color: actionColor, fontWeight: "600" }}>Done</Text>
      </Pressable>
    ),
  };
};

const getHeaderBackgroundColor = (
  colorScheme: "light" | "dark",
  isEinkMode: boolean
): string | undefined => {
  if (isEinkMode) {
    return colors.white;
  }

  if (isIOS26OrNewer()) {
    return;
  }

  return colorScheme === "dark"
    ? navigationColors.dark
    : navigationColors.light;
};

const getNavigationTheme = (
  colorScheme: "light" | "dark",
  isEinkMode: boolean
) => {
  if (isEinkMode) {
    return einkTheme;
  }

  return colorScheme === "dark" ? darkTheme : lightTheme;
};

const getNativeTabIcon = (iosSymbol: string) => ({
  type: "sfSymbol" as const,
  name: iosSymbol as never,
});

const settingsModalStyles = StyleSheet.create({
  androidTabletBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.large,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  androidTabletBackdropPressable: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  androidTabletSheet: {
    width: "100%",
    maxWidth: 760,
    height: "92%",
    borderRadius: radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  androidTabletNavigatorHost: {
    flex: 1,
    minHeight: 0,
  },
});

type SettingsFlowStackScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Settings"
>;

const SettingsFlowStackScreen: React.FunctionComponent<SettingsFlowStackScreenProps> =
  ({ navigation }: SettingsFlowStackScreenProps) => {
    const colorScheme = useColorScheme();
    const uiPreferences = useUiPreferences();
    const navigationTheme = getNavigationTheme(
      colorScheme,
      uiPreferences.isEinkMode
    );
    const actionColor = getActionColor(uiPreferences.isEinkMode);
    const { isTablet: isTabletLayout } = useTabletLayout();

    const settingsFlowNavigator = (
      <SettingsFlowStack.Navigator
        initialRouteName="SettingsView"
        screenOptions={{
          headerTintColor: actionColor,
          headerShadowVisible: false,
          headerLargeTitle: false,
          ...(uiPreferences.disableAnimations
            ? { animation: "none" as const }
            : {}),
          ...(Platform.OS === "ios"
            ? {
                headerBackButtonDisplayMode: "minimal" as const,
                headerBackTitleVisible: false,
              }
            : {}),
          headerStyle: {
            backgroundColor: getHeaderBackgroundColor(
              colorScheme,
              uiPreferences.isEinkMode
            ),
          },
          headerTitleStyle: {
            color: navigationTheme.colors.text,
          },
        }}
      >
        <SettingsFlowStack.Screen
          name="SettingsView"
          component={SettingsScreen}
          options={() => ({
            title: "Settings",
            headerBackVisible: false,
            ...(Platform.OS === "android" ? { headerLeft: () => <></> } : {}),
            ...getDoneButtonOptions(
              () => navigation.goBack(),
              uiPreferences.isEinkMode,
              actionColor
            ),
          })}
        />
        <SettingsFlowStack.Screen
          name="Available Plans"
          component={SelectPlanScreen}
          options={{ headerLargeTitle: false }}
        />
        <SettingsFlowStack.Screen
          name="Font Size"
          component={FontSizePickerScreen}
          options={{ headerLargeTitle: false }}
        />
        <SettingsFlowStack.Screen
          name="Account Sign In"
          component={AccountSignInScreen}
          options={{ title: "Sign In", headerLargeTitle: false }}
        />
      </SettingsFlowStack.Navigator>
    );

    if (!isTabletLayout) {
      return (
        <View style={settingsModalStyles.androidTabletNavigatorHost}>
          {settingsFlowNavigator}
        </View>
      );
    }

    return (
      <View
        style={[
          settingsModalStyles.androidTabletBackdrop,
          uiPreferences.isEinkMode && { backgroundColor: colors.white },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close settings"
          accessibilityHint="Dismisses the settings modal."
          style={settingsModalStyles.androidTabletBackdropPressable}
          onPress={() => navigation.goBack()}
        />
        <View
          style={[
            settingsModalStyles.androidTabletSheet,
            {
              borderColor: navigationTheme.colors.border,
              backgroundColor: navigationTheme.colors.background,
            },
          ]}
        >
          <View style={settingsModalStyles.androidTabletNavigatorHost}>
            {settingsFlowNavigator}
          </View>
        </View>
      </View>
    );
  };

const PodcastStack = (): React.JSX.Element => {
  const colorScheme = useColorScheme();
  const uiPreferences = useUiPreferences();
  const navigationTheme = getNavigationTheme(
    colorScheme,
    uiPreferences.isEinkMode
  );
  const actionColor = getActionColor(uiPreferences.isEinkMode);

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: actionColor,
        headerShadowVisible: false,
        headerLargeTitle: true,
        ...(uiPreferences.disableAnimations
          ? { animation: "none" as const }
          : {}),
        ...(Platform.OS === "ios"
          ? {
              headerBackButtonDisplayMode: "minimal" as const,
              headerBackTitleVisible: false,
            }
          : {}),
        headerStyle: {
          backgroundColor: getHeaderBackgroundColor(
            colorScheme,
            uiPreferences.isEinkMode
          ),
        },
        headerTitleStyle: {
          color: navigationTheme.colors.text,
        },
      }}
    >
      <Stack.Screen name="Resources" component={PodcastScreen} />
    </Stack.Navigator>
  );
};

const WeekStack = (): React.JSX.Element => {
  const colorScheme = useColorScheme();
  const uiPreferences = useUiPreferences();
  const navigationTheme = getNavigationTheme(
    colorScheme,
    uiPreferences.isEinkMode
  );
  const actionColor = getActionColor(uiPreferences.isEinkMode);

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: actionColor,
        headerShadowVisible: false,
        headerLargeTitle: true,
        ...(uiPreferences.disableAnimations
          ? { animation: "none" as const }
          : {}),
        ...(Platform.OS === "ios"
          ? {
              headerBackButtonDisplayMode: "minimal" as const,
              headerBackTitleVisible: false,
            }
          : {}),
        headerStyle: {
          backgroundColor: getHeaderBackgroundColor(
            colorScheme,
            uiPreferences.isEinkMode
          ),
        },
        headerTitleStyle: {
          color: navigationTheme.colors.text,
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
                  tintColor: actionColor,
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
                style={({ pressed }) =>
                  getPressFeedbackStyle(pressed, uiPreferences.isEinkMode, 0.6)
                }
              >
                <Ionicons name="cog" size={24} color={actionColor} />
              </Pressable>
            ),
          };
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsFlowStackScreen}
        options={{
          presentation: "transparentModal",
          animation: uiPreferences.disableAnimations ? "none" : "fade",
          headerShown: false,
          contentStyle: {
            backgroundColor: "transparent",
          },
        }}
      />
      <Stack.Screen
        name="Ambient Sounds"
        component={AmbientSoundPickerScreen}
        options={{
          title: "Ambient Sounds",
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="Font Size"
        component={FontSizePickerScreen}
        options={({ navigation }) => ({
          ...(Platform.OS === "ios" && Platform.isPad
            ? { presentation: "formSheet" as const }
            : { presentation: "modal" as const }),
          headerLargeTitle: false,
          headerBackVisible: false,
          ...(Platform.OS === "android" ? { headerLeft: () => <></> } : {}),
          ...getDoneButtonOptions(
            () => navigation.goBack(),
            uiPreferences.isEinkMode,
            actionColor
          ),
        })}
      />
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
  const uiPreferences = useUiPreferences();
  const navigationTheme = getNavigationTheme(
    colorScheme,
    uiPreferences.isEinkMode
  );
  const actionColor = getActionColor(uiPreferences.isEinkMode);

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: actionColor,
        headerShadowVisible: false,
        headerLargeTitle: true,
        ...(uiPreferences.disableAnimations
          ? { animation: "none" as const }
          : {}),
        headerStyle: {
          backgroundColor: getHeaderBackgroundColor(
            colorScheme,
            uiPreferences.isEinkMode
          ),
        },
        headerTitleStyle: {
          color: navigationTheme.colors.text,
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
  const uiPreferences = useUiPreferences();
  const navigationTheme = getNavigationTheme(
    colorScheme,
    uiPreferences.isEinkMode
  );
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.large,
        backgroundColor: navigationTheme.colors.background,
      }}
    >
      <Text
        style={{
          textAlign: "center",
          color: navigationTheme.colors.text,
        }}
      >
        This feature is available to church members.
      </Text>
    </View>
  );
};

const MemberStack = (): React.JSX.Element => {
  const colorScheme = useColorScheme();
  const uiPreferences = useUiPreferences();
  const navigationTheme = getNavigationTheme(
    colorScheme,
    uiPreferences.isEinkMode
  );
  const actionColor = getActionColor(uiPreferences.isEinkMode);
  const isMember = useAppSelector(selectIsMember);

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: actionColor,
        headerShadowVisible: false,
        headerLargeTitle: true,
        ...(uiPreferences.disableAnimations
          ? { animation: "none" as const }
          : {}),
        ...(Platform.OS === "ios"
          ? {
              headerBackButtonDisplayMode: "minimal" as const,
              headerBackTitleVisible: false,
            }
          : {}),
        headerStyle: {
          backgroundColor: getHeaderBackgroundColor(
            colorScheme,
            uiPreferences.isEinkMode
          ),
        },
        headerTitleStyle: {
          color: navigationTheme.colors.text,
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
                      tintColor: actionColor,
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
                    style={({ pressed }) =>
                      getPressFeedbackStyle(
                        pressed,
                        uiPreferences.isEinkMode,
                        0.65
                      )
                    }
                  >
                    <Text style={{ color: actionColor, fontWeight: "600" }}>
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
  const uiPreferences = useUiPreferences();
  const navigationTheme = getNavigationTheme(
    colorScheme,
    uiPreferences.isEinkMode
  );
  const actionColor = getActionColor(uiPreferences.isEinkMode);
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
    const initializeSettings = async () => {
      void dispatch(getEnableChurchCenterDeepLink());
      void dispatch(getEnableEinkMode());

      const shouldAutoEnableEinkMode = await maybeAutoEnableEinkMode();
      if (shouldAutoEnableEinkMode) {
        void dispatch(storeEnableEinkMode(true));
      }
    };

    void initializeSettings();
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
          tabBarActiveTintColor: actionColor,
          tabBarStyle: {
            backgroundColor: isIOS26OrNewer()
              ? undefined
              : uiPreferences.isEinkMode
              ? colors.white
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
        tabBarActiveTintColor: actionColor,
        tabBarInactiveTintColor: navigationTheme.colors.text,
        tabBarStyle: {
          backgroundColor: uiPreferences.isEinkMode
            ? colors.white
            : colorScheme === "dark"
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
  const uiPreferences = useUiPreferences();
  const navigationTheme = getNavigationTheme(
    colorScheme,
    uiPreferences.isEinkMode
  );
  const actionColor = getActionColor(uiPreferences.isEinkMode);
  const isIPad = Platform.OS === "ios" && Platform.isPad;
  const { setHeight, setIsTabBarVisible } =
    React.useContext(TabBarHeightContext);

  return (
    <NavigationContainer
      theme={navigationTheme}
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
          headerTintColor: actionColor,
          headerShadowVisible: false,
          ...(uiPreferences.disableAnimations
            ? { animation: "none" as const }
            : {}),
          headerStyle: {
            backgroundColor: getHeaderBackgroundColor(
              colorScheme,
              uiPreferences.isEinkMode
            ),
          },
          headerTitleStyle: {
            color: navigationTheme.colors.text,
          },
          ...(isIOS26OrNewer()
            ? { headerBackButtonDisplayMode: "minimal" as const }
            : {}),
          ...(Platform.OS === "android" ? { statusBarTranslucent: true } : {}),
          statusBarStyle:
            uiPreferences.isEinkMode || colorScheme === "light"
              ? "dark"
              : "light",
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Read" component={ReadScreen} />
        <Stack.Screen
          name="Available Plans"
          component={SelectPlanScreen}
          options={
            isIPad
              ? {
                  presentation: "formSheet",
                  headerLargeTitle: false,
                }
              : {
                  headerLargeTitle: false,
                }
          }
        />
        <Stack.Screen name="Font Size" component={FontSizePickerScreen} />
        <Stack.Screen name="Schedule" component={ScheduleScreen} />
        <Stack.Screen name="Sundays" component={SundaysScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
