import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";

const EINK_AUTO_DETECT_DONE_KEY = "@settings/einkAutoDetectDone";
const EINK_BRAND_MODEL_PATTERN =
  /(onyx|boox|bigme|boyue|meebook|hisense|inkbook|remarkable|supernote|kobo|tolino)/i;
const EINK_FEATURE_PATTERN = /(eink|epd|epaper|e-paper)/i;

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
    featureMatch = EINK_FEATURE_PATTERN.test(features.join(" "));
  } catch {
    featureMatch = false;
  }

  return brandModelMatch || featureMatch;
};

export const maybeAutoEnableEinkMode = async (): Promise<boolean> => {
  if (Platform.OS !== "android") {
    return false;
  }

  try {
    const hasRunAutoDetect = await AsyncStorage.getItem(
      EINK_AUTO_DETECT_DONE_KEY
    );
    if (hasRunAutoDetect === "true") {
      return false;
    }

    const isLikelyEinkDevice = await detectLikelyEinkAndroidDevice();
    await AsyncStorage.setItem(EINK_AUTO_DETECT_DONE_KEY, "true");

    return isLikelyEinkDevice;
  } catch (error) {
    console.warn("E-ink auto-detection failed", error);
    return false;
  }
};
