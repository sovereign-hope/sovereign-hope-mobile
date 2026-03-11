import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "src/navigation/RootNavigator";
import { useAppSelector } from "src/hooks/store";
import { selectAllHighlights } from "src/redux/highlightsSlice";
import { HIGHLIGHT_COLORS } from "src/constants/highlights";
import { BIBLE_BOOKS } from "src/constants/bibleBooks";
import type { Highlight } from "src/types/highlights";

type Props = NativeStackScreenProps<RootStackParamList, "Highlights">;

// ── Group highlights by book ────────────────────────────────────
type BookGroup = {
  bookId: string;
  bookName: string;
  highlights: Highlight[];
};

const getBookName = (bookId: string): string =>
  BIBLE_BOOKS.find((b) => b.id === bookId)?.name ?? bookId;

const getBookOrder = (bookId: string): number => {
  const idx = BIBLE_BOOKS.findIndex((b) => b.id === bookId);
  return idx >= 0 ? idx : 999;
};

const groupByBook = (highlights: Highlight[]): BookGroup[] => {
  const map = new Map<string, Highlight[]>();
  for (const h of highlights) {
    const list = map.get(h.bookId) ?? [];
    list.push(h);
    map.set(h.bookId, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => getBookOrder(a) - getBookOrder(b))
    .map(([bookId, items]) => ({
      bookId,
      bookName: getBookName(bookId),
      highlights: items.sort((a, b) => {
        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
        return a.startVerse - b.startVerse;
      }),
    }));
};

// ── Component ───────────────────────────────────────────────────
export const HighlightsScreen: React.FunctionComponent<Props> = ({
  navigation,
}) => {
  const theme = useTheme();
  const highlights = useAppSelector(selectAllHighlights);
  const colorMode = theme.dark ? "dark" : "light";

  const groups = useMemo(() => groupByBook(highlights), [highlights]);

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
        flexDirection: "row" as const,
        alignItems: "center" as const,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.dark ? "#444444" : "#E8E8E8",
        gap: 12,
      },
      colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
      },
      rowText: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text,
      },
      chevron: {
        color: theme.dark ? "#666666" : "#C0C0C0",
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
    }),
    [theme]
  );

  const formatVerseRange = (h: Highlight): string => {
    const range =
      h.startVerse === h.endVerse
        ? `${h.startVerse}`
        : `${h.startVerse}-${h.endVerse}`;
    return `${h.chapter}:${range}`;
  };

  // Flatten groups into a list of section headers + rows
  type ListItem =
    | { type: "header"; bookName: string; key: string }
    | {
        type: "highlight";
        highlight: Highlight;
        bookName: string;
        key: string;
      };

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    for (const group of groups) {
      items.push({
        type: "header",
        bookName: group.bookName,
        key: `header-${group.bookId}`,
      });
      for (const h of group.highlights) {
        items.push({
          type: "highlight",
          highlight: h,
          bookName: group.bookName,
          key: h.id,
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

  if (highlights.length === 0) {
    return (
      <SafeAreaView edges={["bottom"]} style={themedStyles.container}>
        <View style={themedStyles.emptyContainer}>
          <Ionicons
            name="color-palette-outline"
            size={48}
            style={themedStyles.emptyIcon}
          />
          <Text style={themedStyles.emptyTitle}>No Highlights Yet</Text>
          <Text style={themedStyles.emptyBody}>
            Tap a verse while reading to start highlighting. Tap a second verse
            to highlight a range.
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

          const h = item.highlight;
          return (
            <Pressable
              style={({ pressed }) => [
                themedStyles.row,
                pressed && { opacity: 0.6 },
              ]}
              onPress={() => {
                navigation.navigate("Bible");
                // TODO: Navigate to specific chapter — requires BibleScreen to accept initial location
              }}
              accessibilityRole="button"
              accessibilityLabel={`${item.bookName} ${formatVerseRange(h)}`}
              accessibilityHint="Navigates to this highlighted passage"
            >
              <View
                style={[
                  themedStyles.colorDot,
                  {
                    backgroundColor: HIGHLIGHT_COLORS[h.color][colorMode],
                  },
                ]}
              />
              <Text style={themedStyles.rowText}>
                {item.bookName} {formatVerseRange(h)}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={themedStyles.chevron.color}
              />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
};
