import React, { useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { SIDEBAR_PADDING_VERTICAL, styles } from "./AlphabetSidebar.styles";

const ALPHABET = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

interface AlphabetSidebarProps {
  availableLetters: Set<string>;
  onSelectLetter: (letter: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const AlphabetSidebar: React.FunctionComponent<AlphabetSidebarProps> = ({
  availableLetters,
  onSelectLetter,
  style,
}: AlphabetSidebarProps) => {
  const theme = useTheme();
  const themedStyles = useMemo(() => styles({ theme }), [theme]);
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrubbingLetter, setScrubbingLetter] = useState("");
  const lastTriggeredLetterRef = useRef("");

  const getLetterAtPosition = (positionY: number): string | undefined => {
    if (containerHeight <= 0) {
      return undefined;
    }

    const contentHeight = containerHeight - SIDEBAR_PADDING_VERTICAL * 2;
    const relativeY = positionY - SIDEBAR_PADDING_VERTICAL;
    const ratio = Math.max(0, Math.min(1, relativeY / contentHeight));
    const letterIndex = Math.round(ratio * (ALPHABET.length - 1));
    return ALPHABET[letterIndex];
  };

  const triggerLetterAtPosition = (positionY: number) => {
    const nextLetter = getLetterAtPosition(positionY);
    if (!nextLetter) {
      return;
    }

    setScrubbingLetter(nextLetter);

    if (!availableLetters.has(nextLetter)) {
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
    <View style={[themedStyles.wrapper, style]}>
      {scrubbingLetter ? (
        <View style={themedStyles.indicator}>
          <Text style={themedStyles.indicatorText}>{scrubbingLetter}</Text>
        </View>
      ) : undefined}
      <View
        style={themedStyles.container}
        onLayout={handleLayout}
        onTouchStart={(event) => {
          triggerLetterAtPosition(event.nativeEvent.locationY);
        }}
        onTouchMove={(event) => {
          triggerLetterAtPosition(event.nativeEvent.locationY);
        }}
        onTouchEnd={() => {
          lastTriggeredLetterRef.current = "";
          setScrubbingLetter("");
        }}
        accessibilityRole="adjustable"
        accessibilityLabel="Directory alphabet index"
        accessibilityHint="Tap and hold, then drag to jump through directory sections."
      >
        {ALPHABET.map((letter) => {
          const isAvailable = availableLetters.has(letter);
          const isActive = scrubbingLetter === letter;

          return (
            <Pressable
              key={letter}
              style={[
                themedStyles.letterButton,
                isActive ? themedStyles.activeLetterButton : undefined,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Jump to ${letter}`}
              accessibilityHint={
                isAvailable
                  ? `Jump to directory entries under ${letter}.`
                  : `${letter} has no directory entries.`
              }
              accessibilityState={{
                disabled: !isAvailable,
                selected: isActive,
              }}
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
    </View>
  );
};
