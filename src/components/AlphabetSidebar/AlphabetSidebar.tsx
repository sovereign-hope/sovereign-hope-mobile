import React, { useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { styles } from "./AlphabetSidebar.styles";

const ALPHABET = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

interface AlphabetSidebarProps {
  availableLetters: Set<string>;
  onSelectLetter: (letter: string) => void;
  activeLetter?: string;
  style?: StyleProp<ViewStyle>;
}

export const AlphabetSidebar: React.FunctionComponent<AlphabetSidebarProps> = ({
  availableLetters,
  onSelectLetter,
  activeLetter,
  style,
}: AlphabetSidebarProps) => {
  const theme = useTheme();
  const themedStyles = styles({ theme });
  const [containerHeight, setContainerHeight] = useState(0);
  const lastTriggeredLetterRef = useRef("");

  const triggerLetterAtPosition = (positionY: number) => {
    if (containerHeight <= 0) {
      return;
    }

    const letterHeight = containerHeight / ALPHABET.length;
    const letterIndex = Math.max(
      0,
      Math.min(ALPHABET.length - 1, Math.floor(positionY / letterHeight))
    );
    const nextLetter = ALPHABET[letterIndex];
    if (!nextLetter || !availableLetters.has(nextLetter)) {
      return;
    }

    if (lastTriggeredLetterRef.current === nextLetter) {
      return;
    }

    lastTriggeredLetterRef.current = nextLetter;
    onSelectLetter(nextLetter);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerHeight(event.nativeEvent.layout.height);
  };

  return (
    <View
      style={[themedStyles.container, style]}
      onLayout={handleLayout}
      onTouchStart={(event) => {
        triggerLetterAtPosition(event.nativeEvent.locationY);
      }}
      onTouchMove={(event) => {
        triggerLetterAtPosition(event.nativeEvent.locationY);
      }}
      onTouchEnd={() => {
        lastTriggeredLetterRef.current = "";
      }}
      accessibilityRole="adjustable"
      accessibilityLabel="Directory alphabet index"
      accessibilityHint="Swipe or tap letters to jump through directory sections."
    >
      {ALPHABET.map((letter) => {
        const isAvailable = availableLetters.has(letter);
        const isActive = activeLetter === letter;

        return (
          <Pressable
            key={letter}
            style={themedStyles.letterButton}
            accessibilityRole="button"
            accessibilityLabel={`Jump to ${letter}`}
            accessibilityHint={
              isAvailable
                ? `Jump to directory entries under ${letter}.`
                : `${letter} has no directory entries.`
            }
            accessibilityState={{ disabled: !isAvailable, selected: isActive }}
            onPress={() => {
              if (isAvailable) {
                lastTriggeredLetterRef.current = "";
                onSelectLetter(letter);
                return;
              }
            }}
          >
            <Text
              style={[
                themedStyles.letterText,
                isActive ? themedStyles.activeLetterText : undefined,
                isAvailable ? undefined : themedStyles.disabledLetterText,
              ]}
            >
              {letter}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
