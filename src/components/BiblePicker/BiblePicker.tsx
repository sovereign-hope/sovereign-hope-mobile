import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, ScrollView, Text, View, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useTheme } from "@react-navigation/native";
import { BIBLE_BOOKS } from "src/constants/bibleBooks";
import type { BibleBook } from "src/constants/bibleBooks";
import type { BibleLocation } from "src/types/bible";
import { Ionicons } from "@expo/vector-icons";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { styles } from "./BiblePicker.styles";

// ─── Public handle ───────────────────────────────────────────────
export interface BiblePickerHandle {
  present: () => void;
  dismiss: () => void;
}

interface BiblePickerProps {
  currentLocation: BibleLocation;
  onSelectLocation: (location: BibleLocation) => void;
}

// ─── Section header data ─────────────────────────────────────────
type BookListItem =
  | { type: "header"; title: string }
  | { type: "book"; book: BibleBook };

const buildBookList = (): BookListItem[] => {
  const items: BookListItem[] = [];
  let addedNewTestament = false;
  items.push({ type: "header", title: "Old Testament" });
  for (const book of BIBLE_BOOKS) {
    if (book.testament === "new" && !addedNewTestament) {
      items.push({ type: "header", title: "New Testament" });
      addedNewTestament = true;
    }
    items.push({ type: "book", book });
  }
  return items;
};

/** Build sticky header indices without Array#reduce */
const getStickyIndices = (items: BookListItem[]): number[] => {
  const indices: number[] = [];
  for (const [index, item] of items.entries()) {
    if (item.type === "header") {
      indices.push(index);
    }
  }
  return indices;
};

// ─── Component ───────────────────────────────────────────────────
export const BiblePicker = forwardRef<BiblePickerHandle, BiblePickerProps>(
  function BiblePicker({ currentLocation, onSelectLocation }, ref) {
    const theme = useTheme();
    const uiPreferences = useUiPreferences();
    const themedStyles = styles({
      theme,
      isEinkMode: uiPreferences.isEinkMode,
    });

    const bottomSheetRef = useRef<BottomSheetModal>(null);
    // eslint-disable-next-line unicorn/no-null
    const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
    const snapPoints = useMemo(() => ["50%", "85%"], []);

    useImperativeHandle(ref, () => ({
      present: () => {
        // eslint-disable-next-line unicorn/no-null
        setSelectedBook(null);
        bottomSheetRef.current?.present();
      },
      dismiss: () => {
        bottomSheetRef.current?.dismiss();
      },
    }));

    const bookListData = useMemo(buildBookList, []);
    const stickyIndices = useMemo(
      () => getStickyIndices(bookListData),
      [bookListData]
    );

    // ── Book list ──────────────────────────────────────────────
    const handleBookPress = useCallback((book: BibleBook) => {
      if (book.isSingleChapter) {
        return;
      }
      if (Platform.OS === "ios") void Haptics.selectionAsync();
      setSelectedBook(book);
      bottomSheetRef.current?.snapToIndex(1);
    }, []);

    const handleSingleChapterBookPress = useCallback(
      (book: BibleBook) => {
        if (Platform.OS === "ios")
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelectLocation({ bookId: book.id, chapter: 1 });
        bottomSheetRef.current?.dismiss();
      },
      [onSelectLocation]
    );

    const renderBookItem = useCallback(
      ({ item }: { item: BookListItem }) => {
        if (item.type === "header") {
          return <Text style={themedStyles.sectionHeader}>{item.title}</Text>;
        }

        const { book } = item;
        const isSelected = book.id === currentLocation.bookId;

        if (book.isSingleChapter) {
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={book.name}
              accessibilityHint="Opens this book"
              onPress={() => handleSingleChapterBookPress(book)}
              style={({ pressed }) => [
                themedStyles.bookRow,
                isSelected && themedStyles.bookRowSelected,
                pressed && themedStyles.bookRowPressed,
              ]}
            >
              <Text
                style={[
                  themedStyles.bookName,
                  isSelected && themedStyles.bookNameSelected,
                ]}
              >
                {book.name}
              </Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={book.name}
            accessibilityHint={`Shows chapters for ${book.name}`}
            onPress={() => handleBookPress(book)}
            style={({ pressed }) => [
              themedStyles.bookRow,
              isSelected && themedStyles.bookRowSelected,
              pressed && themedStyles.bookRowPressed,
            ]}
          >
            <Text
              style={[
                themedStyles.bookName,
                isSelected && themedStyles.bookNameSelected,
              ]}
            >
              {book.name}
            </Text>
            <Text style={themedStyles.chapterCount}>
              {book.chapterCount} ch.
            </Text>
          </Pressable>
        );
      },
      [
        currentLocation.bookId,
        handleBookPress,
        handleSingleChapterBookPress,
        themedStyles,
      ]
    );

    const bookKeyExtractor = useCallback(
      (item: BookListItem, index: number) =>
        item.type === "header" ? `header-${index}` : `book-${item.book.id}`,
      []
    );

    // ── Chapter grid ───────────────────────────────────────────
    const handleChapterPress = useCallback(
      (chapter: number) => {
        if (!selectedBook) {
          return;
        }
        if (Platform.OS === "ios")
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelectLocation({ bookId: selectedBook.id, chapter });
        bottomSheetRef.current?.dismiss();
      },
      [onSelectLocation, selectedBook]
    );

    const handleBackToBooks = useCallback(() => {
      if (Platform.OS === "ios") void Haptics.selectionAsync();
      // eslint-disable-next-line unicorn/no-null
      setSelectedBook(null);
      bottomSheetRef.current?.snapToIndex(0);
    }, []);

    const chapterNumbers = useMemo(() => {
      if (!selectedBook) {
        return [];
      }
      return Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1);
    }, [selectedBook]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
        />
      ),
      []
    );

    // ── Render ─────────────────────────────────────────────────
    const handleSheetDismiss = useCallback(() => {
      // eslint-disable-next-line unicorn/no-null
      setSelectedBook(null);
    }, []);

    const renderChapterGrid = () => {
      if (!selectedBook) {
        // eslint-disable-next-line unicorn/no-null
        return null;
      }

      return (
        <BottomSheetView style={themedStyles.chapterContainer}>
          <View style={themedStyles.chapterHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to book list"
              accessibilityHint="Returns to the list of Bible books"
              onPress={handleBackToBooks}
              style={({ pressed }) => [
                themedStyles.backButton,
                pressed && themedStyles.backButtonPressed,
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {Platform.OS === "ios" && (
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={themedStyles.backButtonText.color}
                  />
                )}
                <Text style={themedStyles.backButtonText}>Books</Text>
              </View>
            </Pressable>
            <Text style={themedStyles.chapterTitle}>{selectedBook.name}</Text>
            <View style={themedStyles.backButton} />
          </View>
          <ScrollView contentContainerStyle={themedStyles.chapterGrid}>
            {chapterNumbers.map((ch) => {
              const isSelected =
                selectedBook.id === currentLocation.bookId &&
                ch === currentLocation.chapter;

              return (
                <Pressable
                  key={ch}
                  accessibilityRole="button"
                  accessibilityLabel={`Chapter ${ch}`}
                  accessibilityHint={`Opens ${selectedBook.name} chapter ${ch}`}
                  onPress={() => handleChapterPress(ch)}
                  style={({ pressed }) => [
                    themedStyles.chapterCell,
                    isSelected && themedStyles.chapterCellSelected,
                    pressed && themedStyles.chapterCellPressed,
                  ]}
                >
                  <Text
                    style={[
                      themedStyles.chapterNumber,
                      isSelected && themedStyles.chapterNumberSelected,
                    ]}
                  >
                    {ch}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </BottomSheetView>
      );
    };

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        onDismiss={handleSheetDismiss}
        backdropComponent={renderBackdrop}
        backgroundStyle={themedStyles.sheetBackground}
        handleIndicatorStyle={themedStyles.handleIndicator}
      >
        {selectedBook ? (
          renderChapterGrid()
        ) : (
          <BottomSheetFlatList
            data={bookListData}
            keyExtractor={bookKeyExtractor}
            renderItem={renderBookItem}
            stickyHeaderIndices={stickyIndices}
            contentContainerStyle={themedStyles.bookListContent}
          />
        )}
      </BottomSheetModal>
    );
  }
);
