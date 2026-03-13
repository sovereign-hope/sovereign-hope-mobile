import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  Alert,
  AppState,
  AppStateStatus,
  InteractionManager,
} from "react-native";
import { useColorScheme } from "src/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { Provider as StoreProvider } from "react-redux";
import { store } from "src/app/store";
import { RootScreen } from "src/screens/RootScreen/RootScreen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import * as Sentry from "@sentry/react-native";
import { MediaPlayer } from "src/components";
import { TabBarHeightContext } from "src/navigation/TabBarContext";
import { MediaPlayerContext } from "src/navigation/MediaPlayerContext";
import NetInfo from "@react-native-community/netinfo";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import { initializeFirebaseServices } from "src/config/firebase";
import {
  initializeAuthListener,
  refreshAuthClaims,
  runSyncNow,
  selectAuthIsInitialized,
  selectIsAuthenticated,
} from "src/redux/authSlice";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import * as SystemUI from "expo-system-ui";
import { background as backgroundColors } from "src/style/colors";
import { initializeTrackPlayer } from "src/services/trackPlayerSetup";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

// Keep the splash screen visible while we fetch resources
// eslint-disable-next-line @typescript-eslint/no-floating-promises
SplashScreen.preventAutoHideAsync();

Sentry.init({
  dsn: "https://dbde8c51f1c9466a8b8544f44558518e@o1095845.ingest.sentry.io/6115782",
  debug: process.env.ENVIRONMENT !== "production",
});

const configureGoogleSignIn = () => {
  const extraGoogleAuth = (
    Constants.expoConfig?.extra as
      | { googleAuth?: { webClientId?: string; iosClientId?: string } }
      | undefined
  )?.googleAuth;

  GoogleSignin.configure({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    webClientId:
      extraGoogleAuth?.webClientId ??
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    iosClientId:
      extraGoogleAuth?.iosClientId ??
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
};

const appLoading = async () => {
  await Font.loadAsync(Ionicons.font);

  // Configure axios
  axios.defaults.headers.common = {
    Authorization: "Token f1cc9c43ce1b1ef0c255171722eed4086057ee39",
  };

  initializeFirebaseServices();
};

const showErrorAlert = () => {
  // We're in real bad shape if we get here and localization has likely failed
  Alert.alert(
    "A critical error has occurred",
    "Please reach out to Sovereign Hope support for assistance."
  );
};

// Redux App wrapper
const AppLifecycleSyncEffects = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authIsInitialized = useAppSelector(selectAuthIsInitialized);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAtRef = useRef<number>(-1);
  const lastNetworkSyncRef = useRef<number>(0);

  useEffect(() => {
    void dispatch(initializeAuthListener());
  }, [dispatch]);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackgrounded = /inactive|background/.test(appStateRef.current);

      if (/inactive|background/.test(nextState)) {
        backgroundedAtRef.current = Date.now();
      }

      appStateRef.current = nextState;

      if (wasBackgrounded && nextState === "active" && isAuthenticated) {
        void dispatch(refreshAuthClaims());
        const backgroundDuration =
          backgroundedAtRef.current > 0
            ? Date.now() - backgroundedAtRef.current
            : Infinity;
        backgroundedAtRef.current = -1;
        if (backgroundDuration > 30_000) {
          void dispatch(runSyncNow({ reason: "foreground" }));
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable && isAuthenticated) {
        const now = Date.now();
        if (now - lastNetworkSyncRef.current < 5000) {
          return;
        }
        lastNetworkSyncRef.current = now;
        void dispatch(runSyncNow({ reason: "network-reconnect" }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (authIsInitialized && isAuthenticated) {
      const interactionTask = InteractionManager.runAfterInteractions(() => {
        void dispatch(runSyncNow({ reason: "manual" }));
      });

      return () => {
        interactionTask.cancel();
      };
    }
  }, [authIsInitialized, isAuthenticated, dispatch]);

  return <></>;
};

const App = (): React.JSX.Element => {
  // State Hooks
  const [isReady, updateIsReady] = useState(false);
  const colorScheme = useColorScheme();
  const [tabBarHeight, setTabBarHeight] = useState<number>(0);
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);
  const [isMediaPlayerVisible, setIsMediaPlayerVisible] =
    useState<boolean>(false);
  const [cachedHeight, setCachedHeight] = useState<number>(0);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [isTabBarVisible, setIsTabBarVisible] = useState<boolean>(true);

  useEffect(() => {
    async function prepare() {
      try {
        await appLoading();
      } catch (error) {
        console.warn(error);
        showErrorAlert();
      } finally {
        // Tell the application to render
        updateIsReady(true);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    prepare();
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(
      colorScheme === "dark" ? backgroundColors.dark : backgroundColors.light
    );
  }, [colorScheme]);

  useEffect(() => {
    void initializeTrackPlayer();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (isReady) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      await SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return <></>;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StoreProvider store={store}>
        <TabBarHeightContext.Provider
          value={{
            height: tabBarHeight,
            setHeight: setTabBarHeight,
            measuredHeight,
            setMeasuredHeight,
            cachedHeight,
            setCachedHeight,
            isCached,
            setIsCached,
            isTabBarVisible,
            setIsTabBarVisible,
          }}
        >
          <MediaPlayerContext.Provider
            value={{
              isVisible: isMediaPlayerVisible,
              setIsVisible: setIsMediaPlayerVisible,
            }}
          >
            <GestureHandlerRootView
              style={{
                flex: 1,
                backgroundColor:
                  colorScheme === "dark"
                    ? backgroundColors.dark
                    : backgroundColors.light,
              }}
              onLayout={() => {
                void onLayoutRootView();
              }}
            >
              <BottomSheetModalProvider>
                <AppLifecycleSyncEffects />
                <RootScreen />
                <MediaPlayer id="sov-hope-media-player" />
              </BottomSheetModalProvider>
            </GestureHandlerRootView>
          </MediaPlayerContext.Provider>
        </TabBarHeightContext.Provider>
      </StoreProvider>
    </SafeAreaProvider>
  );
};

export default Sentry.wrap(App);
