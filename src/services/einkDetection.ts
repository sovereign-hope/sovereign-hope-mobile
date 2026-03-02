import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";

const EINK_AUTO_DETECT_DONE_KEY = "@settings/einkAutoDetectDone";
const EINK_AUTO_DETECT_RECONCILED_KEY = "@settings/einkAutoDetectReconciled";
const EINK_MODE_KEY = "@settings/enableEinkMode";
const EINK_BRAND_MODEL_PATTERN =
  /(onyx|boox|bigme|boyue|meebook|hisense|inkbook|remarkable|supernote|kobo|tolino)/i;
const EINK_FEATURE_TOKEN_PATTERN =
  /(?:^|[._-])(eink|epd|epaper|e-paper)(?:$|[._-])/i;

const buildDeviceIdentity = (): string => {
  return [Device.brand, Device.manufacturer, Device.modelName]
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join(" ");
};

export const detectLikelyEinkAndroidDevice = async (): Promise<boolean> => {
  if (Platform.OS !== "android") {
    return false;
  }

  const deviceIdentity = buildDeviceIdentity();
  const brandModelMatch = EINK_BRAND_MODEL_PATTERN.test(deviceIdentity);

  let featureMatch = false;
  try {
    const features = await Device.getPlatformFeaturesAsync();
    featureMatch = features.some((feature) =>
      EINK_FEATURE_TOKEN_PATTERN.test(feature)
    );
  } catch {
    featureMatch = false;
  }

  return brandModelMatch || featureMatch;
};

const parseBoolean = (value: string | null): boolean => {
  if (value === "true") {
    return true;
  }
  if (value === "false" || value === null) {
    return false;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "boolean" ? parsed : false;
  } catch {
    return false;
  }
};

export type EinkAutoDetectionResolution = "enable" | "disable" | "none";

export const maybeAutoEnableEinkMode =
  async (): Promise<EinkAutoDetectionResolution> => {
    if (Platform.OS !== "android") {
      return "none";
    }

    try {
      const hasRunAutoDetect = await AsyncStorage.getItem(
        EINK_AUTO_DETECT_DONE_KEY
      );
      if (hasRunAutoDetect !== "true") {
        const isLikelyEinkDevice = await detectLikelyEinkAndroidDevice();
        await AsyncStorage.setItem(EINK_AUTO_DETECT_DONE_KEY, "true");
        return isLikelyEinkDevice ? "enable" : "none";
      }

      const hasReconciledAutoDetect = await AsyncStorage.getItem(
        EINK_AUTO_DETECT_RECONCILED_KEY
      );
      if (hasReconciledAutoDetect === "true") {
        return "none";
      }

      const [isLikelyEinkDevice, enabledValue] = await Promise.all([
        detectLikelyEinkAndroidDevice(),
        AsyncStorage.getItem(EINK_MODE_KEY),
      ]);
      await AsyncStorage.setItem(EINK_AUTO_DETECT_RECONCILED_KEY, "true");
      const isEinkModeEnabled = parseBoolean(enabledValue);

      if (isEinkModeEnabled && !isLikelyEinkDevice) {
        return "disable";
      }

      return "none";
    } catch (error) {
      console.warn("E-ink auto-detection failed", error);
      return "none";
    }
  };
