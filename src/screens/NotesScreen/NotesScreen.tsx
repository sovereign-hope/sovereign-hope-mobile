import React, { useCallback, useMemo, useRef } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable, TouchableOpacity } from "react-native-gesture-handler";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "src/navigation/RootNavigator";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { selectAllNotes } from "src/redux/notesSlice";
import { selectAuthUser } from "src/redux/authSlice";
import { deleteNoteWithSync } from "src/hooks/useNoteActions";
import { BIBLE_BOOKS } from "src/constants/bibleBooks";
import { getBookName } from "src/app/bibleUtils";
import type { Note } from "src/types/notes";

type Props = NativeStackScreenProps<RootStackParamList, "Notes">;

// ── Group notes by book ────────────────────────────────────────
type BookGroup = {
  bookId: string;
  bookName: string;
  notes: Note[];
};

const getBookOrder = (bookId: string): number => {
  const idx = BIBLE_BOOKS.findIndex((b) => b.id === bookId);
  return idx >= 0 ? idx : 999;
};

const groupByBook = (notes: Note[]): BookGroup[] => {
  const map = new Map<string, Note[]>();
  for (const n of notes) {
    const list = map.get(n.bookId) ?? [];
    list.push(n);
    map.set(n.bookId, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => getBookOrder(a) - getBookOrder(b))
    .map(([bookId, items]) => ({
      bookId,
      bookName: getBookName(bookId),
      notes: items.sort((a, b) => {
        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
        return a.startVerse - b.startVerse;
      }),
    }));
};

const MAX_PREVIEW_LENGTH = 80;

const truncateText = (text: string): string => {
  if (text.length <= MAX_PREVIEW_LENGTH) return text;
  return `${text.slice(0, MAX_PREVIEW_LENGTH).trimEnd()}...`;
};

const DELETE_ACTION_WIDTH = 80;

// ── Component ───────────────────────────────────────────────────
export const NotesScreen: React.FunctionComponent<Props> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const notes = useAppSelector(selectAllNotes);
  const user = useAppSelector(selectAuthUser);

  // Track open swipeable refs so we can close them
  const swipeableRefs = useRef(new Map<string, Swipeable>());

  const groups = useMemo(() => groupByBook(notes), [notes]);

  const themedStyles = useMemo(
    () => ({
      container: {
        flex: 1,
        backgroundColor: theme.colors.background,
      } as const,
      sectionHeader: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: theme.dark ? "#2A2A2A" : "#F5F5F5",
      } as const,
      sectionHeaderText: {
        fontSize: 15,
        fontWeight: "600" as const,
        color: theme.colors.text,
      },
      row: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.dark ? "#444444" : "#E8E8E8",
        gap: 4,
        backgroundColor: theme.dark ? theme.colors.background : "#FFFFFF",
      } as const,
      rowHeader: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
      },
      rowReference: {
        fontSize: 16,
        fontWeight: "500" as const,
        color: theme.colors.text,
      },
      chevron: {
        color: theme.dark ? "#666666" : "#C0C0C0",
      },
      rowPreview: {
        fontSize: 14,
        color: theme.dark ? "#999999" : "#888888",
        lineHeight: 20,
      },
      emptyContainer: {
        flex: 1,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        paddingHorizontal: 32,
      },
      emptyIcon: {
        marginBottom: 16,
        color: theme.dark ? "#555555" : "#CCCCCC",
      },
      emptyTitle: {
        fontSize: 18,
        fontWeight: "600" as const,
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: "center" as const,
      },
      emptyBody: {
        fontSize: 14,
        color: theme.dark ? "#888888" : "#999999",
        textAlign: "center" as const,
        lineHeight: 20,
      },
      deleteAction: {
        width: DELETE_ACTION_WIDTH,
        backgroundColor: "#FF3B30",
        justifyContent: "center" as const,
        alignItems: "center" as const,
      },
      deleteActionText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "600" as const,
        marginTop: 4,
      },
    }),
    [theme]
  );

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      deleteNoteWithSync(dispatch, user?.uid, noteId);
    },
    [dispatch, user?.uid]
  );

  const confirmDelete = useCallback(
    (noteId: string) => {
      Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            swipeableRefs.current.get(noteId)?.close();
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteNote(noteId),
        },
      ]);
    },
    [handleDeleteNote]
  );

  const formatChapterVerse = (n: Note): string => {
    const range =
      n.startVerse === n.endVerse
        ? `${n.startVerse}`
        : `${n.startVerse}-${n.endVerse}`;
    return `${n.chapter}:${range}`;
  };

  // Flatten groups into a list of section headers + rows
  type ListItem =
    | { type: "header"; bookName: string; key: string }
    | { type: "note"; note: Note; bookName: string; key: string };

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    for (const group of groups) {
      items.push({
        type: "header",
        bookName: group.bookName,
        key: `header-${group.bookId}`,
      });
      for (const n of group.notes) {
        items.push({
          type: "note",
          note: n,
          bookName: group.bookName,
          key: n.id,
        });
      }
    }
    return items;
  }, [groups]);

  const stickyIndices = useMemo(
    () =>
      listData
        .map((item, i) => (item.type === "header" ? i : -1))
        .filter((i) => i >= 0),
    [listData]
  );

  const renderRightActions = useCallback(
    () => (
      <View style={themedStyles.deleteAction}>
        <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        <Text style={themedStyles.deleteActionText}>Delete</Text>
      </View>
    ),
    [themedStyles]
  );

  if (notes.length === 0) {
    return (
      <SafeAreaView edges={["bottom"]} style={themedStyles.container}>
        <View style={themedStyles.emptyContainer}>
          <Ionicons
            name="document-text-outline"
            size={48}
            style={themedStyles.emptyIcon}
          />
          <Text style={themedStyles.emptyTitle}>No Notes Yet</Text>
          <Text style={themedStyles.emptyBody}>
            Add a note while reading by tapping the note icon in the toolbar,
            then selecting a verse.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={themedStyles.container}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        stickyHeaderIndices={stickyIndices}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <View style={themedStyles.sectionHeader}>
                <Text style={themedStyles.sectionHeaderText}>
                  {item.bookName}
                </Text>
              </View>
            );
          }

          const n = item.note;
          return (
            <Swipeable
              ref={(ref) => {
                if (ref) {
                  swipeableRefs.current.set(n.id, ref);
                } else {
                  swipeableRefs.current.delete(n.id);
                }
              }}
              renderRightActions={renderRightActions}
              onSwipeableOpen={() => confirmDelete(n.id)}
              overshootRight={false}
            >
              <TouchableOpacity
                style={themedStyles.row}
                activeOpacity={0.6}
                onPress={() => {
                  navigation.navigate("Bible", {
                    bookId: n.bookId,
                    chapter: n.chapter,
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel={`${item.bookName} ${formatChapterVerse(
                  n
                )}: ${truncateText(n.text)}`}
                accessibilityHint="Navigates to this passage"
              >
                <View style={themedStyles.rowHeader}>
                  <Text style={themedStyles.rowReference}>
                    {item.bookName} {formatChapterVerse(n)}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={themedStyles.chevron.color}
                  />
                </View>
                <Text style={themedStyles.rowPreview} numberOfLines={2}>
                  {truncateText(n.text)}
                </Text>
              </TouchableOpacity>
            </Swipeable>
          );
        }}
      />
    </SafeAreaView>
  );
};
