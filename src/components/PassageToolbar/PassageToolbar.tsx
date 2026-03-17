import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Platform, Pressable, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { Ionicons } from "@expo/vector-icons";
import { canUseLiquidGlass } from "src/services/liquidGlassSupport";
import { styles } from "./PassageToolbar.styles";

export interface PassageToolbarAction {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onPress: () => void;
}

interface PassageToolbarProps {
  actions: PassageToolbarAction[];
  /** When false, the toolbar slides off-screen. Defaults to true. */
  visible?: boolean;
  /** Extra offset above the safe area (e.g. for a tab bar overlay). Defaults to 0. */
  bottomOffset?: number;
}

const ANIMATION_DURATION = 200;

export const PassageToolbar: React.FunctionComponent<PassageToolbarProps> = ({
  actions,
  visible = true,
  bottomOffset = 0,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset =
    Platform.OS === "android" ? 0 : insets.bottom + bottomOffset;

  const stableStyles = useMemo(
    () => styles.stable({ bottomInset }),
    [bottomInset]
  );
  const themedStyles = useMemo(() => styles.themed({ theme }), [theme]);

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : 160,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  const shouldUseLiquidGlass = canUseLiquidGlass(Platform.OS, {
    isGlassEffectCheck: isGlassEffectAPIAvailable,
    isLiquidGlassCheck: isLiquidGlassAvailable,
  });
  const shouldUseBlur = Platform.OS === "ios" && !shouldUseLiquidGlass;

  if (actions.length === 0) {
    // eslint-disable-next-line unicorn/no-null
    return null;
  }

  const useGlassLayer = shouldUseLiquidGlass || shouldUseBlur;

  return (
    <Animated.View
      style={[
        stableStyles.container,
        !useGlassLayer && themedStyles.containerSolid,
        shouldUseBlur && themedStyles.containerBlurFallback,
        { transform: [{ translateY }] },
      ]}
      pointerEvents="box-none"
    >
      {shouldUseLiquidGlass && (
        <GlassView
          style={stableStyles.glassBackground}
          glassEffectStyle="regular"
          colorScheme="auto"
          isInteractive={false}
          pointerEvents="none"
        />
      )}
      {shouldUseBlur && (
        <>
          <BlurView
            style={stableStyles.blurBackground}
            tint={theme.dark ? "dark" : "light"}
            intensity={80}
            pointerEvents="none"
          />
          <View style={themedStyles.blurOverlay} pointerEvents="none" />
        </>
      )}
      <View style={stableStyles.row}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel ?? action.label}
            accessibilityHint={action.accessibilityHint}
            onPress={action.onPress}
            style={({ pressed }) => [
              themedStyles.button,
              pressed && themedStyles.buttonPressed,
            ]}
          >
            <Ionicons name={action.icon} size={22} color={theme.colors.text} />
            <Text style={themedStyles.label}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
};
