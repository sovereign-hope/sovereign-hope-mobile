/* eslint-disable unicorn/no-null */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth, initializeAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAvvBaPklg1pC7fb1gyo7B9WaU8a4NMh2g",
  authDomain: "sovereign-hope-mobile.firebaseapp.com",
  projectId: "sovereign-hope-mobile",
  storageBucket: "sovereign-hope-mobile.appspot.com",
  messagingSenderId: "816081321481",
  appId: "1:816081321481:web:f44dc2a4f1d29f973f42d8",
  measurementId: "G-WBM7136G5P",
};

let firebaseAppSingleton: FirebaseApp | undefined;
let firebaseAuthSingleton: Auth | undefined;
let firebaseFirestoreSingleton: Firestore | undefined;

const getReactNativePersistenceCompat = (
  storage: typeof AsyncStorage
): unknown => {
  try {
    // Some Firebase versions used in this repo do not export `firebase/auth/react-native`,
    // but still bundle the RN helper internally. Load it lazily so app startup doesn't crash.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rnAuth =
      // eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
      require("firebase/node_modules/@firebase/auth/dist/rn/index") as {
        getReactNativePersistence?: (value: typeof AsyncStorage) => unknown;
      };
    return rnAuth.getReactNativePersistence?.(storage);
  } catch {
    return undefined;
  }
};

export const initializeFirebaseServices = (): {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} => {
  const app =
    firebaseAppSingleton ??
    (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig));
  firebaseAppSingleton = app;

  if (!firebaseAuthSingleton) {
    try {
      const reactNativePersistence =
        getReactNativePersistenceCompat(AsyncStorage);
      firebaseAuthSingleton = reactNativePersistence
        ? initializeAuth(app, {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            persistence: reactNativePersistence as any,
          })
        : getAuth(app);
    } catch {
      // initializeAuth throws if already initialized in some environments (tests/HMR).
      firebaseAuthSingleton = getAuth(app);
    }
  }

  if (!firebaseFirestoreSingleton) {
    firebaseFirestoreSingleton = getFirestore(app);
  }

  return {
    app,
    auth: firebaseAuthSingleton,
    firestore: firebaseFirestoreSingleton,
  };
};

export const getFirebaseApp = (): FirebaseApp =>
  initializeFirebaseServices().app;

export const getFirebaseAuth = (): Auth => initializeFirebaseServices().auth;

export const getFirebaseFirestore = (): Firestore =>
  initializeFirebaseServices().firestore;

/* eslint-enable unicorn/no-null */
