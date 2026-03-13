import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "src/navigation/RootNavigator";
import { useNoteActions } from "src/hooks/useNoteActions";
import { BIBLE_BOOKS } from "src/constants/bibleBooks";
import { colors } from "src/style/colors";
import { useUiPreferences } from "src/hooks/useUiPreferences";

type Props = NativeStackScreenProps<RootStackParamList, "NoteEditor">;

const getBookName = (bookId: string): string =>
  BIBLE_BOOKS.find((b) => b.id === bookId)?.name ?? bookId;

const formatVerseRange = (
  bookId: string,
  chapter: number,
  startVerse: number,
  endVerse: number
): string => {
  const bookName = getBookName(bookId);
  const range =
    startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`;
  return `${bookName} ${chapter}:${range}`;
};

export const NoteEditorScreen: React.FunctionComponent<Props> = ({
  navigation,
  route,
}) => {
  const { bookId, chapter, startVerse, endVerse, noteId, initialText } =
    route.params;
  const theme = useTheme();
  const uiPreferences = useUiPreferences();
  const { createNote, updateNote, deleteNote } = useNoteActions(
    bookId,
    chapter
  );

  const [text, setText] = useState(initialText ?? "");
  const inputRef = useRef<TextInput>(null);
  const isEditing = !!noteId;

  const accentColor = uiPreferences.isEinkMode
    ? theme.dark
      ? colors.white
      : colors.black
    : colors.accent;

  const themedStyles = useMemo(
    () => ({
      container: {
        flex: 1,
        backgroundColor: theme.colors.background,
      } as const,
      header: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.dark ? "#333333" : "#E8E8E8",
      },
      headerButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
      },
      headerButtonText: {
        fontSize: 17,
        color: accentColor,
      },
      headerButtonTextDisabled: {
        opacity: 0.4,
      },
      reference: {
        fontSize: 15,
        fontWeight: "600" as const,
        color: theme.colors.text,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
      },
      input: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text,
        paddingHorizontal: 16,
        paddingTop: 8,
        textAlignVertical: "top" as const,
        lineHeight: 24,
      },
      deleteRow: {
        flexDirection: "row" as const,
        justifyContent: "center" as const,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: theme.dark ? "#333333" : "#E8E8E8",
      },
      deleteButton: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 16,
      },
      deleteButtonText: {
        fontSize: 16,
        color: "#FF3B30",
      },
    }),
    [theme, accentColor]
  );

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    if (isEditing && noteId) {
      updateNote(noteId, trimmed);
    } else {
      createNote(startVerse, endVerse, trimmed);
    }
    navigation.goBack();
  }, [
    text,
    isEditing,
    noteId,
    updateNote,
    createNote,
    startVerse,
    endVerse,
    navigation,
  ]);

  const handleDelete = useCallback(() => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (noteId) {
            deleteNote(noteId);
          }
          navigation.goBack();
        },
      },
    ]);
  }, [noteId, deleteNote, navigation]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const canSave = text.trim().length > 0;

  return (
    <SafeAreaView edges={["bottom"]} style={themedStyles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={themedStyles.header}>
          <Pressable
            onPress={handleCancel}
            style={themedStyles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            accessibilityHint="Discard changes and go back"
          >
            <Text style={themedStyles.headerButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={themedStyles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Save note"
            accessibilityHint="Save your note for this passage"
            accessibilityState={{ disabled: !canSave }}
          >
            <Text
              style={[
                themedStyles.headerButtonText,
                { fontWeight: "600" },
                !canSave && themedStyles.headerButtonTextDisabled,
              ]}
            >
              Save
            </Text>
          </Pressable>
        </View>

        <Text style={themedStyles.reference}>
          {formatVerseRange(bookId, chapter, startVerse, endVerse)}
        </Text>

        <TextInput
          ref={inputRef}
          style={themedStyles.input}
          value={text}
          onChangeText={setText}
          placeholder="Write your note..."
          placeholderTextColor={theme.dark ? "#666666" : "#AAAAAA"}
          multiline
          autoFocus
          textAlignVertical="top"
          accessibilityLabel="Note text"
          accessibilityHint="Enter your note for this passage"
        />

        {isEditing && (
          <View style={themedStyles.deleteRow}>
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                themedStyles.deleteButton,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Delete note"
              accessibilityHint="Permanently delete this note"
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              <Text style={themedStyles.deleteButtonText}>Delete Note</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
