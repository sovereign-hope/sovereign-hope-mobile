import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { useAppSelector } from "src/hooks/store";
import { selectEnableEinkMode } from "src/redux/settingsSlice";

export interface UiPreferences {
  isEinkMode: boolean;
  isReduceMotionEnabled: boolean;
  isReduceTransparencyEnabled: boolean;
  disableAnimations: boolean;
  disableTransparency: boolean;
  disablePressOpacity: boolean;
  forceOutlines: boolean;
  disableShadows: boolean;
}

export const useUiPreferences = (): UiPreferences => {
  const isEinkMode = useAppSelector(selectEnableEinkMode);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);
  const [isReduceTransparencyEnabled, setIsReduceTransparencyEnabled] =
    useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        setIsReduceMotionEnabled(enabled);
        return enabled;
      })
      .catch(() => {
        setIsReduceMotionEnabled(false);
      });

    const motionSubscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        setIsReduceMotionEnabled(enabled);
      }
    );

    if (Platform.OS !== "ios") {
      return () => {
        motionSubscription.remove();
      };
    }

    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((enabled) => {
        setIsReduceTransparencyEnabled(enabled);
        return enabled;
      })
      .catch(() => {
        setIsReduceTransparencyEnabled(false);
      });

    const transparencySubscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      (enabled) => {
        setIsReduceTransparencyEnabled(enabled);
      }
    );

    return () => {
      motionSubscription.remove();
      transparencySubscription.remove();
    };
  }, []);

  return useMemo(
    () => ({
      isEinkMode,
      isReduceMotionEnabled,
      isReduceTransparencyEnabled,
      disableAnimations: isEinkMode || isReduceMotionEnabled,
      disableTransparency: isEinkMode || isReduceTransparencyEnabled,
      disablePressOpacity: isEinkMode,
      forceOutlines: isEinkMode,
      disableShadows: isEinkMode,
    }),
    [isEinkMode, isReduceMotionEnabled, isReduceTransparencyEnabled]
  );
};
