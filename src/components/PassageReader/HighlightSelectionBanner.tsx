import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { BIBLE_BOOKS } from "src/constants/bibleBooks";
import type { ParsedVerse } from "./highlightUtils";

interface HighlightSelectionBannerProps {
  /** The first-selected verse */
  verse: ParsedVerse;
  /** Cancel the pending selection */
  onCancel: () => void;
  /** Extra bottom offset to clear tab bar / mini player */
  bottomOffset?: number;
}

const getBookName = (bookId: string): string =>
  BIBLE_BOOKS.find((b) => b.id === bookId)?.name ?? bookId;

const bannerStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    gap: 12,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
});

export const HighlightSelectionBanner: React.FunctionComponent<HighlightSelectionBannerProps> =
  ({ verse, onCancel, bottomOffset = 0 }) => {
    const theme = useTheme();

    const handleCancel = () => {
      if (Platform.OS === "ios") void Haptics.selectionAsync();
      onCancel();
    };

    const bookName = getBookName(verse.bookId);

    return (
      <View
        style={[
          bannerStyles.container,
          {
            bottom: 16 + bottomOffset,
            backgroundColor: theme.dark ? "#444444" : "#FFFFFF",
            shadowColor: "#000000",
          },
        ]}
      >
        <Text
          style={[
            bannerStyles.text,
            { color: theme.dark ? "#E0E0E0" : "#333333" },
          ]}
        >
          Tap another verse to highlight {bookName} {verse.chapter}:
          {verse.verse} through it
        </Text>
        <Pressable
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel highlight selection"
          accessibilityHint="Cancels the current verse selection"
          hitSlop={8}
        >
          <Ionicons
            name="close-circle"
            size={22}
            color={theme.dark ? "#AAAAAA" : "#888888"}
          />
        </Pressable>
      </View>
    );
  };
