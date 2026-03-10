import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { Ionicons } from "@expo/vector-icons";
import { canUseLiquidGlass } from "src/services/liquidGlassSupport";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { colors } from "src/style/colors";
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
}

const ANIMATION_DURATION = 200;

export const PassageToolbar: React.FunctionComponent<PassageToolbarProps> = ({
  actions,
  visible = true,
}) => {
  const theme = useTheme();
  const uiPreferences = useUiPreferences();
  const themedStyles = styles({ theme, isEinkMode: uiPreferences.isEinkMode });

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -80,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  const shouldUseLiquidGlass = canUseLiquidGlass(Platform.OS, {
    isGlassEffectCheck: isGlassEffectAPIAvailable,
    isLiquidGlassCheck: isLiquidGlassAvailable,
  });
  const shouldUseBlur = Platform.OS === "ios" && !shouldUseLiquidGlass;

  const actionColor = uiPreferences.isEinkMode
    ? theme.dark
      ? colors.white
      : colors.black
    : colors.accent;

  if (actions.length === 0) {
    // eslint-disable-next-line unicorn/no-null
    return null;
  }

  const useGlassLayer = shouldUseLiquidGlass || shouldUseBlur;

  return (
    <Animated.View
      style={[
        themedStyles.container,
        !useGlassLayer && themedStyles.containerSolid,
        { transform: [{ translateY }] },
      ]}
      pointerEvents="box-none"
    >
      {shouldUseLiquidGlass && (
        <GlassView
          style={themedStyles.glassBackground}
          glassEffectStyle="regular"
          colorScheme="auto"
          isInteractive={false}
          pointerEvents="none"
        />
      )}
      {shouldUseBlur && (
        <>
          <BlurView
            style={themedStyles.blurBackground}
            tint={theme.dark ? "dark" : "light"}
            intensity={80}
            pointerEvents="none"
          />
          <View style={themedStyles.blurOverlay} pointerEvents="none" />
        </>
      )}
      <View style={themedStyles.row}>
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
            <Ionicons name={action.icon} size={22} color={actionColor} />
            <Text style={themedStyles.label}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
};
