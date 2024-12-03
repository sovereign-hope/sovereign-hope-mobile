import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Alert } from "react-native";
import { useColorScheme } from "src/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { Provider as StoreProvider } from "react-redux";
import { store } from "src/app/store";
import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { RootScreen } from "src/screens/RootScreen/RootScreen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import TrackPlayer, { Capability, Track } from "react-native-track-player";
import playerService from "./service";
import * as Sentry from "@sentry/react-native";
import { MiniPlayer } from "src/components";

// Keep the splash screen visible while we fetch resources
// eslint-disable-next-line @typescript-eslint/no-floating-promises
SplashScreen.preventAutoHideAsync();

Sentry.init({
  dsn: "https://dbde8c51f1c9466a8b8544f44558518e@o1095845.ingest.sentry.io/6115782",
  debug: process.env.ENVIRONMENT !== "production",
});

const appLoading = async () => {
  await Font.loadAsync(Ionicons.font);

  // Configure axios
  axios.defaults.headers.common = {
    Authorization: "Token f1cc9c43ce1b1ef0c255171722eed4086057ee39",
  };

  // Initialize Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyAvvBaPklg1pC7fb1gyo7B9WaU8a4NMh2g",
    authDomain: "sovereign-hope-mobile.firebaseapp.com",
    projectId: "sovereign-hope-mobile",
    storageBucket: "sovereign-hope-mobile.appspot.com",
    messagingSenderId: "816081321481",
    appId: "1:816081321481:web:f44dc2a4f1d29f973f42d8",
    measurementId: "G-WBM7136G5P",
  };

  // Initialize Firebase
  const app: FirebaseApp = initializeApp(firebaseConfig);
  getFirestore(app);
};

const showErrorAlert = () => {
  // We're in real bad shape if we get here and localization has likely failed
  Alert.alert(
    "A critical error has occurred",
    "Please reach out to Sovereign Hope support for assistance."
  );
};

// Redux App wrapper
const App = (): JSX.Element => {
  // State Hooks
  const [isReady, updateIsReady] = useState(false);
  const colorScheme = useColorScheme();

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
    TrackPlayer.registerPlaybackService(() => playerService);

    async function setupPlayer() {
      try {
        await TrackPlayer.setupPlayer();
      } catch (error) {
        console.log(error);
      }
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.JumpForward,
          Capability.JumpBackward,
          Capability.Stop,
          Capability.SeekTo,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
      });
    }

    void setupPlayer();
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

  // Effect hooks
  return (
    <GestureHandlerRootView
      style={{ flex: 1 }}
      onLayout={() => {
        void onLayoutRootView();
      }}
    >
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <StoreProvider store={store}>
        <RootScreen />
        <MiniPlayer id="sov-hope-mini-player" />
      </StoreProvider>
    </GestureHandlerRootView>
  );
};

export default Sentry.wrap(App);
