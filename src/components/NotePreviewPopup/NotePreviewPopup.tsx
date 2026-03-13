import React, { useMemo } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { colors } from "src/style/colors";

interface NotePreviewPopupProps {
  /** The note text to preview */
  text: string;
  /** Verse reference label (e.g. "Matthew 5:3-4") */
  reference: string;
  /** Called when user taps "Edit" */
  onEdit: () => void;
  /** Called when user taps outside or dismisses */
  onDismiss: () => void;
}

const MAX_PREVIEW_LINES = 6;

export const NotePreviewPopup: React.FunctionComponent<NotePreviewPopupProps> =
  ({ text, reference, onEdit, onDismiss }) => {
    const theme = useTheme();
    const uiPreferences = useUiPreferences();

    const accentColor = uiPreferences.isEinkMode
      ? theme.dark
        ? colors.white
        : colors.black
      : colors.accent;

    const themedStyles = useMemo(
      () => ({
        overlay: {
          flex: 1,
          justifyContent: "center" as const,
          alignItems: "center" as const,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          paddingHorizontal: 32,
        },
        card: {
          width: "100%" as const,
          maxWidth: 340,
          backgroundColor: theme.dark ? "#2A2A2A" : "#FFFFFF",
          borderRadius: 14,
          overflow: "hidden" as const,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 8,
        },
        header: {
          flexDirection: "row" as const,
          alignItems: "center" as const,
          justifyContent: "space-between" as const,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 8,
        },
        reference: {
          fontSize: 15,
          fontWeight: "600" as const,
          color: theme.colors.text,
          flex: 1,
        },
        closeButton: {
          padding: 4,
        },
        body: {
          paddingHorizontal: 16,
          paddingBottom: 14,
        },
        noteText: {
          fontSize: 15,
          color: theme.dark ? "#CCCCCC" : "#444444",
          lineHeight: 22,
        },
        footer: {
          borderTopWidth: 1,
          borderTopColor: theme.dark ? "#444444" : "#E8E8E8",
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: "row" as const,
          justifyContent: "flex-end" as const,
        },
        editButton: {
          flexDirection: "row" as const,
          alignItems: "center" as const,
          gap: 6,
          paddingVertical: 6,
          paddingHorizontal: 12,
        },
        editButtonText: {
          fontSize: 16,
          fontWeight: "600" as const,
          color: accentColor,
        },
      }),
      [theme, accentColor]
    );

    return (
      <Modal
        transparent
        animationType="fade"
        onRequestClose={onDismiss}
        statusBarTranslucent
      >
        <Pressable
          style={themedStyles.overlay}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss note preview"
          accessibilityHint="Closes the note preview popup"
        >
          <View style={themedStyles.card}>
            <View style={themedStyles.header}>
              <Text style={themedStyles.reference} numberOfLines={1}>
                {reference}
              </Text>
              <Pressable
                onPress={onDismiss}
                style={({ pressed }) => [
                  themedStyles.closeButton,
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close preview"
                accessibilityHint="Dismisses the note preview"
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={theme.dark ? "#888888" : "#999999"}
                />
              </Pressable>
            </View>

            <View style={themedStyles.body}>
              <Text
                style={themedStyles.noteText}
                numberOfLines={MAX_PREVIEW_LINES}
              >
                {text}
              </Text>
            </View>

            <View style={themedStyles.footer}>
              <Pressable
                onPress={onEdit}
                style={({ pressed }) => [
                  themedStyles.editButton,
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Edit note"
                accessibilityHint="Opens the note editor"
              >
                <Ionicons name="create-outline" size={18} color={accentColor} />
                <Text style={themedStyles.editButtonText}>Edit</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    );
  };
