import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  HIGHLIGHT_COLORS,
  HIGHLIGHT_COLOR_ORDER,
} from "src/constants/highlights";
import type { HighlightColor } from "src/types/highlights";
import { useAppSelector } from "src/hooks/store";
import { selectHighlightPickerSide } from "src/redux/settingsSlice";

const SLIDE_DURATION = 200;
const PANEL_WIDTH = 48;

interface HighlightColorPickerProps {
  /** Currently selected color (shown with a checkmark) */
  activeColor: HighlightColor;
  /** Called when user taps a color swatch */
  onSelectColor: (color: HighlightColor) => void;
  /** Called when user taps the delete/remove button */
  onDelete: () => void;
  /** Called when user taps outside or wants to dismiss */
  onDismiss: () => void;
}

const pickerStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  panel: {
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  panelLeft: {
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  panelRight: {
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  swatch: {
    padding: 4,
  },
  swatchPressed: {
    opacity: 0.6,
  },
  swatchCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  swatchActive: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  divider: {
    height: 1,
    width: 24,
    marginVertical: 4,
  },
  actionButton: {
    padding: 6,
  },
  actionButtonPressed: {
    opacity: 0.6,
  },
});

export const HighlightColorPicker: React.FunctionComponent<HighlightColorPickerProps> =
  ({ activeColor, onSelectColor, onDelete, onDismiss }) => {
    const theme = useTheme();
    const colorMode = theme.dark ? "dark" : "light";
    const side = useAppSelector(selectHighlightPickerSide);

    // Slide animation: starts off-screen, slides to 0
    const slideAnim = useRef(new Animated.Value(-PANEL_WIDTH)).current;

    useEffect(() => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: SLIDE_DURATION,
        useNativeDriver: true,
      }).start();
    }, [slideAnim]);

    const handleColorPress = useCallback(
      (color: HighlightColor) => {
        if (Platform.OS === "ios") void Haptics.selectionAsync();
        onSelectColor(color);
      },
      [onSelectColor]
    );

    const handleDelete = useCallback(() => {
      if (Platform.OS === "ios")
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onDelete();
    }, [onDelete]);

    const isLeft = side === "left";

    return (
      <Animated.View
        style={[
          pickerStyles.container,
          isLeft ? { left: 0 } : { right: 0 },
          {
            transform: [
              {
                translateX: isLeft
                  ? slideAnim
                  : Animated.multiply(slideAnim, -1),
              },
            ],
          },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={[
            pickerStyles.panel,
            isLeft ? pickerStyles.panelLeft : pickerStyles.panelRight,
            {
              backgroundColor: theme.dark ? "#444444" : "#FFFFFF",
              shadowColor: "#000000",
            },
          ]}
        >
          {HIGHLIGHT_COLOR_ORDER.map((color) => {
            const isActive = color === activeColor;
            return (
              <Pressable
                key={color}
                onPress={() => handleColorPress(color)}
                accessibilityRole="button"
                accessibilityLabel={`${color} highlight color${
                  isActive ? ", selected" : ""
                }`}
                accessibilityHint="Changes the highlight color"
                style={({ pressed }) => [
                  pickerStyles.swatch,
                  pressed && pickerStyles.swatchPressed,
                ]}
              >
                <View
                  style={[
                    pickerStyles.swatchCircle,
                    { backgroundColor: HIGHLIGHT_COLORS[color][colorMode] },
                    isActive && pickerStyles.swatchActive,
                  ]}
                >
                  {isActive && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={theme.dark ? "#FFFFFF" : "#333333"}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}

          {/* Divider */}
          <View
            style={[
              pickerStyles.divider,
              { backgroundColor: theme.dark ? "#666666" : "#E0E0E0" },
            ]}
          />

          {/* Delete button */}
          <Pressable
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="Remove highlight"
            accessibilityHint="Deletes this highlight"
            style={({ pressed }) => [
              pickerStyles.actionButton,
              pressed && pickerStyles.actionButtonPressed,
            ]}
          >
            <Ionicons name="trash-outline" size={18} color="#C94B41" />
          </Pressable>

          {/* Divider */}
          <View
            style={[
              pickerStyles.divider,
              { backgroundColor: theme.dark ? "#666666" : "#E0E0E0" },
            ]}
          />

          {/* Close button */}
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close color picker"
            accessibilityHint="Closes the highlight color picker"
            style={({ pressed }) => [
              pickerStyles.actionButton,
              pressed && pickerStyles.actionButtonPressed,
            ]}
          >
            <Ionicons
              name="close"
              size={18}
              color={theme.dark ? "#AAAAAA" : "#888888"}
            />
          </Pressable>
        </View>
      </Animated.View>
    );
  };
