/* This setup file will be fairly static and pragmatic */
import { Ionicons } from "@expo/vector-icons";
import * as Font from "expo-font";

import "react-native-gesture-handler/jestSetup";

jest.mock("react-native-reanimated", () => {
  const Reanimated = jest.requireActual("react-native-reanimated/mock");
  // The mock for `call` immediately calls the callback which is incorrect
  // So we override it with a no-op
  Reanimated.default.call = jest.fn();
  return Reanimated;
});

// Silence the warning: Animated: `useNativeDriver` is not supported because the native animated module is missing
jest.mock("@react-native/assets-registry/registry");
jest.mock("react-native/Libraries/EventEmitter/NativeEventEmitter");

jest.mock("expo-auth-session/providers/google");
jest.mock("expo-auth-session/providers/facebook");

jest.mock("@react-native-community/netinfo");

jest.mock("react-native-screens", () => {
  const RealComponent = jest.requireActual("react-native-screens");
  RealComponent.enableScreens = jest.fn();
  return RealComponent;
});

const createUseLinkingMock = () => ({
  default: () => ({ getInitialState: { then: jest.fn() } }),
  useLinking: () => ({ getInitialState: { then: jest.fn() } }),
  __esModule: true,
});

const useLinkingModulePaths = [
  "@react-navigation/native/lib/commonjs/useLinking.native",
  "@react-navigation/native/lib/module/useLinking.native",
];

for (const modulePath of useLinkingModulePaths) {
  try {
    require.resolve(modulePath);
    jest.doMock(modulePath, createUseLinkingMock);
    break;
  } catch {
    // Try the next path. React Navigation changed internal build folders.
  }
}

jest.mock("expo-notifications");

// AsyncStorage mock (official)
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Axios mock
jest.mock("axios");

// Track player - minimal mock (add more methods as needed when tests fail)
jest.mock("react-native-track-player", () => ({
  setupPlayer: jest.fn().mockResolvedValue(undefined),
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn().mockResolvedValue(undefined),
  add: jest.fn().mockResolvedValue(undefined),
  getPlaybackState: jest.fn().mockResolvedValue({ state: "none" }),
  usePlaybackState: jest.fn().mockReturnValue({ state: "none" }),
  useProgress: jest
    .fn()
    .mockReturnValue({ position: 0, duration: 0, buffered: 0 }),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  State: { None: "none", Playing: "playing", Paused: "paused" },
}));

// Sentry mock
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: (component) => component,
  captureException: jest.fn(),
}));

// SecureStore mock
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Firebase/Firestore mock
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
  getApp: jest.fn(),
  getApps: jest.fn().mockReturnValue([]),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  initializeAuth: jest.fn(() => ({ currentUser: null })),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithCredential: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn(),
  deleteUser: jest.fn(),
  EmailAuthProvider: {
    credential: jest.fn(() => ({})),
  },
  GoogleAuthProvider: {
    credential: jest.fn(() => ({})),
  },
  OAuthProvider: jest.fn(() => ({
    credential: jest.fn(() => ({})),
  })),
}));

// WebView mock
jest.mock("react-native-webview", () => {
  const { View } = require("react-native");
  return {
    WebView: View,
    default: View,
  };
});

global.beforeAll(async () => Promise.all([Font.loadAsync(Ionicons.font)]));
