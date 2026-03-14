import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
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
          paddingHorizontal: 24,
          paddingVertical: 64,
        },
        card: {
          width: "100%" as const,
          maxWidth: 560,
          maxHeight: "100%" as const,
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
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 8,
        },
        reference: {
          fontSize: 15,
          fontWeight: "600" as const,
          color: theme.colors.text,
        },
        body: {
          flexShrink: 1,
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
          flexDirection: "row" as const,
        },
        footerButton: {
          flex: 1,
          flexDirection: "row" as const,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          gap: 6,
          paddingVertical: 14,
        },
        footerDivider: {
          width: 1,
          backgroundColor: theme.dark ? "#444444" : "#E8E8E8",
        },
        footerButtonText: {
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
          <Pressable
            style={themedStyles.card}
            onPress={() => {}}
            accessibilityRole="none"
          >
            <View style={themedStyles.header}>
              <Text style={themedStyles.reference} numberOfLines={1}>
                {reference}
              </Text>
            </View>

            <ScrollView style={themedStyles.body}>
              <Text style={themedStyles.noteText}>{text}</Text>
            </ScrollView>

            <View style={themedStyles.footer}>
              <Pressable
                onPress={onEdit}
                style={({ pressed }) => [
                  themedStyles.footerButton,
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Edit note"
                accessibilityHint="Opens the note editor"
              >
                <Ionicons name="create-outline" size={18} color={accentColor} />
                <Text style={themedStyles.footerButtonText}>Edit</Text>
              </Pressable>
              <View style={themedStyles.footerDivider} />
              <Pressable
                onPress={onDismiss}
                style={({ pressed }) => [
                  themedStyles.footerButton,
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close preview"
                accessibilityHint="Dismisses the note preview"
              >
                <Ionicons name="close-outline" size={18} color={accentColor} />
                <Text style={themedStyles.footerButtonText}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };
