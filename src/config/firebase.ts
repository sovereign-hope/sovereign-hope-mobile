/* eslint-disable unicorn/no-null */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth, initializeAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { Functions, getFunctions } from "firebase/functions";

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
let firebaseFunctionsSingleton: Functions | undefined;

const STORAGE_AVAILABLE_KEY = "__firebase_rn_async_storage_available__";
type AuthDependencies = NonNullable<Parameters<typeof initializeAuth>[1]>;
type AuthPersistence = AuthDependencies["persistence"];

const getReactNativePersistenceCompat = (
  storage: typeof AsyncStorage
): AuthPersistence => {
  class ReactNativePersistence {
    static type = "LOCAL" as const;

    type = "LOCAL" as const;

    async _isAvailable(): Promise<boolean> {
      try {
        await storage.setItem(STORAGE_AVAILABLE_KEY, "1");
        await storage.removeItem(STORAGE_AVAILABLE_KEY);
        return true;
      } catch {
        return false;
      }
    }

    _set(key: string, value: unknown): Promise<void> {
      return storage.setItem(key, JSON.stringify(value));
    }

    async _get(key: string): Promise<unknown> {
      const json = await storage.getItem(key);
      return json ? (JSON.parse(json) as unknown) : null;
    }

    _remove(key: string): Promise<void> {
      return storage.removeItem(key);
    }

    _addListener(key: string, listener: unknown): void {
      // AsyncStorage doesn't support native key listeners.
      void key;
      void listener;
      return;
    }

    _removeListener(key: string, listener: unknown): void {
      // AsyncStorage doesn't support native key listeners.
      void key;
      void listener;
      return;
    }
  }

  return ReactNativePersistence as AuthPersistence;
};

export const initializeFirebaseServices = (): {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
} => {
  const app =
    firebaseAppSingleton ??
    (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig));
  firebaseAppSingleton = app;

  if (!firebaseAuthSingleton) {
    try {
      const reactNativePersistence =
        getReactNativePersistenceCompat(AsyncStorage);
      firebaseAuthSingleton = initializeAuth(app, {
        persistence: reactNativePersistence,
      });
    } catch {
      // initializeAuth throws if already initialized in some environments (tests/HMR).
      firebaseAuthSingleton = getAuth(app);
    }
  }

  if (!firebaseFirestoreSingleton) {
    firebaseFirestoreSingleton = getFirestore(app);
  }

  if (!firebaseFunctionsSingleton) {
    firebaseFunctionsSingleton = getFunctions(app, "us-central1");
  }

  return {
    app,
    auth: firebaseAuthSingleton,
    firestore: firebaseFirestoreSingleton,
    functions: firebaseFunctionsSingleton,
  };
};

export const getFirebaseApp = (): FirebaseApp =>
  initializeFirebaseServices().app;

export const getFirebaseAuth = (): Auth => initializeFirebaseServices().auth;

export const getFirebaseFirestore = (): Firestore =>
  initializeFirebaseServices().firestore;

export const getFirebaseFunctions = (): Functions =>
  initializeFirebaseServices().functions;

/* eslint-enable unicorn/no-null */
