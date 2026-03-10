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
      contentKey={passageIndex}
      isTransitioning={isNavigatingPassages}
      miniPlayerHeight={miniPlayerHeight}
      bottomInset={bottomInset}
      contentWidth={contentWidth}
      adjustsForInsets={adjustsForInsets}
      renderFooter={renderFooter}
      onClose={onClose}
    />
  );
};
/* eslint-enable react/prop-types */
