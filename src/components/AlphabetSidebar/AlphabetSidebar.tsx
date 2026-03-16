import React, { useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
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
  const [scrubbingLetter, setScrubbingLetter] = useState("");
  const lastTriggeredLetterRef = useRef("");
  const containerRef = useRef<View>(null);
  const layoutRef = useRef({ pageY: 0, height: 0 });

  const getLetterAtPageY = (pageY: number): string | undefined => {
    const { pageY: containerPageY, height } = layoutRef.current;
    if (height <= 0) {
      return undefined;
    }

    const relativeY = pageY - containerPageY - SIDEBAR_PADDING_VERTICAL;
    const contentHeight = height - SIDEBAR_PADDING_VERTICAL * 2;
    if (contentHeight <= 0) {
      return undefined;
    }

    const ratio = Math.max(0, Math.min(1, relativeY / contentHeight));
    const letterIndex = Math.round(ratio * (ALPHABET.length - 1));
    return ALPHABET[letterIndex];
  };

  const triggerLetterAtPageY = (pageY: number) => {
    const nextLetter = getLetterAtPageY(pageY);
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
    const { height } = event.nativeEvent.layout;
    containerRef.current?.measureInWindow((_x, y) => {
      layoutRef.current = { pageY: y, height };
    });
  };

  return (
    <View style={[themedStyles.wrapper, style]}>
      <View
        ref={containerRef}
        style={themedStyles.container}
        pointerEvents="box-only"
        onLayout={handleLayout}
        onTouchStart={(event) => {
          triggerLetterAtPageY(event.nativeEvent.pageY);
        }}
        onTouchMove={(event) => {
          triggerLetterAtPageY(event.nativeEvent.pageY);
        }}
        onTouchEnd={() => {
          lastTriggeredLetterRef.current = "";
          setScrubbingLetter("");
        }}
        accessibilityRole="adjustable"
        accessibilityLabel="Directory alphabet index"
        accessibilityHint="Tap and hold, then drag to jump through directory sections."
      >
        {scrubbingLetter ? (
          <View style={themedStyles.indicatorContainer} pointerEvents="none">
            <View style={themedStyles.indicator}>
              <Text style={themedStyles.indicatorText}>{scrubbingLetter}</Text>
            </View>
          </View>
        ) : undefined}
        {ALPHABET.map((letter) => {
          const isAvailable = availableLetters.has(letter);
          const isActive = scrubbingLetter === letter;

          return (
            <View
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
            </View>
          );
        })}
      </View>
    </View>
  );
};
