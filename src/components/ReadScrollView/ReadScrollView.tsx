/* eslint-disable react/prop-types */
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { FlatButton } from "src/components/FlatButton/FlatButton";
import { styles } from "./ReadScrollView.styles";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { PassageReader } from "src/components/PassageReader/PassageReader";

export interface ReadScrollViewProps {
  showMemoryButton: boolean;
  heading: string;
  passageIndex: number;
  showPreviousPassageButton: boolean;
  canGoToPreviousPassage: boolean;
  isNavigatingPassages: boolean;
  onPreviousPassage: () => void;
  onNextPassage: () => void;
  hasNextPassage: boolean;
  miniPlayerHeight: number;
  bottomInset: number;
  contentWidth?: number;
  adjustsForInsets?: boolean;
  onClose?: () => void;
  onScrollDirectionChange?: (direction: "up" | "down") => void;
  /** ESV 3-letter book ID for verse highlighting */
  bookId?: string;
  /** Chapter number for verse highlighting */
  chapter?: number;
  /** Called when the user taps the note button on a highlighted verse */
  onNote?: (startVerse: number, endVerse: number) => void;
  /** Lookup map: "BOOK:chapter:verse" → true if a note covers that verse */
  noteLookup?: Record<string, boolean>;
  /** Label shown in the sticky header when scrolled down */
  stickyLabel?: string;
}

export const ReadScrollView: React.FunctionComponent<ReadScrollViewProps> = ({
  showMemoryButton,
  heading,
  passageIndex,
  showPreviousPassageButton,
  canGoToPreviousPassage,
  isNavigatingPassages,
  onPreviousPassage,
  onNextPassage,
  hasNextPassage,
  miniPlayerHeight,
  bottomInset,
  contentWidth,
  adjustsForInsets = false,
  onClose,
  onScrollDirectionChange,
  bookId,
  chapter,
  onNote,
  noteLookup,
  stickyLabel,
}: ReadScrollViewProps) => {
  const theme = useTheme();
  const uiPreferences = useUiPreferences();
  const themedStyles = styles({ theme, isEinkMode: uiPreferences.isEinkMode });

  const isPreviousPassageDisabled =
    !canGoToPreviousPassage || isNavigatingPassages;

  const renderFooter = React.useCallback(
    () => (
      <View style={themedStyles.buttonRow}>
        {showPreviousPassageButton && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous passage"
            accessibilityHint="Opens the previous passage in this reading"
            accessibilityState={{ disabled: isPreviousPassageDisabled }}
            disabled={isPreviousPassageDisabled}
            onPress={onPreviousPassage}
            style={({ pressed }) => [
              themedStyles.buttonSecondary,
              isPreviousPassageDisabled && themedStyles.buttonSecondaryDisabled,
              pressed &&
                !isPreviousPassageDisabled &&
                themedStyles.buttonSecondaryPressed,
            ]}
          >
            <Text
              style={[
                themedStyles.buttonSecondaryText,
                isPreviousPassageDisabled &&
                  themedStyles.buttonSecondaryTextDisabled,
              ]}
            >
              Previous
            </Text>
          </Pressable>
        )}
        <FlatButton
          title={hasNextPassage ? "Next" : "Done"}
          onPress={onNextPassage}
          disabled={isNavigatingPassages}
          style={themedStyles.button}
          isEinkMode={uiPreferences.isEinkMode}
        />
      </View>
    ),
    [
      hasNextPassage,
      isNavigatingPassages,
      isPreviousPassageDisabled,
      onNextPassage,
      onPreviousPassage,
      showPreviousPassageButton,
      themedStyles,
      uiPreferences.isEinkMode,
    ]
  );

  return (
    <PassageReader
      heading={heading}
      showMemoryButton={showMemoryButton}
      showStudyQuestions={!showMemoryButton}
      contentKey={passageIndex}
      isTransitioning={isNavigatingPassages}
      miniPlayerHeight={miniPlayerHeight}
      bottomInset={bottomInset}
      contentWidth={contentWidth}
      adjustsForInsets={adjustsForInsets}
      renderFooter={renderFooter}
      onClose={onClose}
      onScrollDirectionChange={onScrollDirectionChange}
      bookId={bookId}
      chapter={chapter}
      onNote={onNote}
      noteLookup={noteLookup}
      stickyLabel={stickyLabel}
    />
  );
};
/* eslint-enable react/prop-types */
