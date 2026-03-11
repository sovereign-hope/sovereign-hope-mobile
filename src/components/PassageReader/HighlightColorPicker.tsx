import React, { useCallback } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  HIGHLIGHT_COLORS,
  HIGHLIGHT_COLOR_ORDER,
} from "src/constants/highlights";
import type { HighlightColor } from "src/types/highlights";

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
  toolbar: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  swatch: {
    padding: 4,
  },
  swatchPressed: {
    opacity: 0.6,
  },
  swatchCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  swatchActive: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 8,
  },
  deleteButton: {
    padding: 6,
  },
  deleteButtonPressed: {
    opacity: 0.6,
  },
});

export const HighlightColorPicker: React.FunctionComponent<HighlightColorPickerProps> =
  ({ activeColor, onSelectColor, onDelete, onDismiss }) => {
    const theme = useTheme();
    const colorMode = theme.dark ? "dark" : "light";

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

    return (
      <>
        {/* Backdrop — tapping dismisses the picker */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss color picker"
          accessibilityHint="Closes the highlight color picker"
        />

        {/* Floating toolbar */}
        <View
          style={[
            pickerStyles.toolbar,
            {
              backgroundColor: theme.dark ? "#444444" : "#FFFFFF",
              shadowColor: theme.dark ? "#000000" : "#000000",
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
                      size={16}
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
              pickerStyles.deleteButton,
              pressed && pickerStyles.deleteButtonPressed,
            ]}
          >
            <Ionicons name="trash-outline" size={20} color="#C94B41" />
          </Pressable>
        </View>
      </>
    );
  };
