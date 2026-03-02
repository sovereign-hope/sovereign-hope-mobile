import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";
import {
  detectLikelyEinkAndroidDevice,
  maybeAutoEnableEinkMode,
} from "src/services/einkDetection";

jest.mock("expo-device", () => ({
  brand: "Google",
  manufacturer: "Google",
  modelName: "Pixel 8",
  getPlatformFeaturesAsync: jest.fn(),
}));

type DeviceMock = {
  brand: string | null;
  manufacturer: string | null;
  modelName: string | null;
  getPlatformFeaturesAsync: jest.Mock<Promise<Array<string>>, []>;
};

const mockedDevice = Device as unknown as DeviceMock;

const setPlatform = (platform: "android" | "ios"): void => {
  Object.defineProperty(Platform, "OS", {
    configurable: true,
    get: () => platform,
  });
};

describe("einkDetection", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    setPlatform("android");
    mockedDevice.brand = "Google";
    mockedDevice.manufacturer = "Google";
    mockedDevice.modelName = "Pixel 8";
    mockedDevice.getPlatformFeaturesAsync.mockResolvedValue([]);
    await AsyncStorage.clear();
  });

  it("does not match non-eink feature names that contain epd as a substring", async () => {
    mockedDevice.getPlatformFeaturesAsync.mockResolvedValue([
      "android.hardware.sensor.stepdetector",
    ]);

    await expect(detectLikelyEinkAndroidDevice()).resolves.toBe(false);
  });

  it("matches explicit eink feature tokens", async () => {
    mockedDevice.getPlatformFeaturesAsync.mockResolvedValue([
      "android.hardware.screen.epd",
    ]);

    await expect(detectLikelyEinkAndroidDevice()).resolves.toBe(true);
  });

  it("returns enable on first run when an eink device is detected", async () => {
    mockedDevice.brand = "onyx";

    await expect(maybeAutoEnableEinkMode()).resolves.toBe("enable");
    await expect(
      AsyncStorage.getItem("@settings/einkAutoDetectDone")
    ).resolves.toBe("true");
  });

  it("returns disable during one-time reconciliation when current device is not eink", async () => {
    await AsyncStorage.multiSet([
      ["@settings/einkAutoDetectDone", "true"],
      ["@settings/enableEinkMode", "true"],
    ]);
    mockedDevice.getPlatformFeaturesAsync.mockResolvedValue([
      "android.hardware.sensor.stepdetector",
    ]);

    await expect(maybeAutoEnableEinkMode()).resolves.toBe("disable");
    await expect(
      AsyncStorage.getItem("@settings/einkAutoDetectReconciled")
    ).resolves.toBe("true");
  });

  it("returns none on iOS", async () => {
    setPlatform("ios");

    await expect(maybeAutoEnableEinkMode()).resolves.toBe("none");
  });
});
