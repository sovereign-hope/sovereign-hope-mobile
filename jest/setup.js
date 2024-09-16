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
jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");

jest.mock("expo-auth-session/providers/google");
jest.mock("expo-auth-session/providers/facebook");

jest.mock("@react-native-community/netinfo");

jest.mock("react-native-screens", () => {
  const RealComponent = jest.requireActual("react-native-screens");
  RealComponent.enableScreens = jest.fn();
  return RealComponent;
});

jest.mock("@react-navigation/native/lib/commonjs/useLinking.native", () => ({
  default: () => ({ getInitialState: { then: jest.fn() } }),
  __esModule: true,
}));

jest.mock("expo-notifications");

global.beforeAll(async () => Promise.all([Font.loadAsync(Ionicons.font)]));
