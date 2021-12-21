import React, { useState } from "react";
import axios from "axios";
import * as Font from "expo-font";
import AppLoading from "expo-app-loading";
import { Alert } from "react-native";
import { useColorScheme } from "src/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { Provider as StoreProvider } from "react-redux";
import { store } from "src/app/store";
import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { RootScreen } from "src/screens/RootScreen/RootScreen";
import { StatusBar } from "expo-status-bar";
import * as Sentry from "sentry-expo";

Sentry.init({
  dsn: "YOUR DSN HERE",
  enableInExpoDevelopment: true,
  debug: process.env.ENVIRONMENT !== "production",
});

const appLoading = async () => {
  await Promise.all([Font.loadAsync(Ionicons.font)]);

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

  // Effect hooks
  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      {!isReady ? (
        <AppLoading
          startAsync={appLoading}
          onFinish={() => updateIsReady(true)}
          onError={showErrorAlert}
        />
      ) : (
        <StoreProvider store={store}>
          <RootScreen />
        </StoreProvider>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default App;
