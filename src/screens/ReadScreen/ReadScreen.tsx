/* eslint-disable react/prop-types */
import React, { useCallback, useMemo, useState } from "react";
import type { Note } from "src/types/notes";
import { ActivityIndicator, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTheme } from "@react-navigation/native";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";
import { usePassageLoader } from "src/hooks/usePassageLoader";
import { playPassageAudio } from "src/services/passageAudio";
import {
  selectAudioUrl,
  selectIsLoading,
  selectPassageHeader,
} from "src/redux/esvSlice";
import { CommonActions } from "@react-navigation/native";
import { ReadScrollView } from "src/components/ReadScrollView/ReadScrollView";
import { PassageToolbar } from "src/components/PassageToolbar/PassageToolbar";
import type { PassageToolbarAction } from "src/components/PassageToolbar/PassageToolbar";
import { fetchBibleChapter } from "src/redux/bibleSlice";
import { passageToLocation } from "src/app/bibleUtils";
import { selectNotesForChapter, buildNoteLookup } from "src/redux/notesSlice";
import { styles } from "./ReadScreen.styles";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { NotePreviewPopup } from "src/components/NotePreviewPopup/NotePreviewPopup";
import { formatVerseReference } from "src/app/bibleUtils";

export type ReadScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Read"
>;

export const ReadScreen: React.FunctionComponent<ReadScreenProps> = ({
  route,
  navigation,
}: ReadScreenProps) => {
  // Props
  const { passages, onComplete } = route.params;

  // Custom hooks
  const dispatch = useAppDispatch();
  const miniPlayerHeight = useMiniPlayerHeight();
  const insets = useSafeAreaInsets();
  const audioUrl = useAppSelector(selectAudioUrl);
  const audioTitle = useAppSelector(selectPassageHeader);
  const isLoading = useAppSelector(selectIsLoading);
  const theme = useTheme();
  const uiPreferences = useUiPreferences();
  const [toolbarVisible, setToolbarVisible] = useState(true);
  // eslint-disable-next-line unicorn/no-null
  const [previewNote, setPreviewNote] = useState<Note | null>(null);

  const handleScrollDirection = useCallback((direction: "up" | "down") => {
    setToolbarVisible(direction === "up");
  }, []);

  const onDone = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const {
    passageIndex,
    shouldShowMemoryButton,
    heading,
    isNavigatingPassages,
    hasLoadedCurrentPassage,
    handleNextPassage,
    handlePreviousPassage,
  } = usePassageLoader(passages, onComplete, onDone);

  // Derive bookId/chapter for highlight + note support
  const currentLocation = useMemo(
    () => passageToLocation(passages[passageIndex]),
    [passageIndex, passages]
  );

  const selectChapterNotes = useMemo(
    () =>
      currentLocation
        ? (state: Parameters<typeof selectNotesForChapter>[0]) =>
            selectNotesForChapter(
              state,
              currentLocation.bookId,
              currentLocation.chapter
            )
        : () => [] as ReturnType<typeof selectNotesForChapter>,
    [currentLocation]
  );
  const chapterNotes = useAppSelector(selectChapterNotes);
  const noteLookup = useMemo(
    () => buildNoteLookup(chapterNotes),
    [chapterNotes]
  );

  // Navbar handlers
  const playAudio = useCallback(async () => {
    if (!audioUrl) {
      return;
    }
    try {
      await playPassageAudio(audioUrl, audioTitle ?? "");
    } catch {
      // Audio playback failure is non-critical
    }
  }, [audioTitle, audioUrl]);

  const showSelectFontSize = useCallback(() => {
    navigation.push("Font Size");
  }, [navigation]);

  const handleOpenInBible = useCallback(() => {
    const currentPassage = passages[passageIndex];
    const location = passageToLocation(currentPassage);
    if (!location) {
      return;
    }

    void dispatch(fetchBibleChapter(location));
    navigation.dispatch(CommonActions.navigate("Home", { screen: "Bible" }));
  }, [dispatch, navigation, passageIndex, passages]);

  // Constants
  const themedStyles = styles({ theme, isEinkMode: uiPreferences.isEinkMode });

  const toolbarActions = useMemo(() => {
    const actions: PassageToolbarAction[] = [
      {
        key: "bible",
        icon: "book-outline",
        label: "Bible",
        accessibilityLabel: "Open in Bible",
        accessibilityHint: "Opens this chapter in the Bible tab",
        onPress: handleOpenInBible,
      },
      {
        key: "font",
        icon: "text-outline",
        label: "Font",
        accessibilityLabel: "Font Size",
        accessibilityHint: "Adjust reading font size",
        onPress: showSelectFontSize,
      },
    ];
    actions.push(
      {
        key: "highlights",
        icon: "star-outline",
        label: "Highlights",
        accessibilityLabel: "View Highlights",
        accessibilityHint: "View all your saved highlights",
        onPress: () => navigation.push("Highlights"),
      },
      {
        key: "notes",
        icon: "document-text-outline",
        label: "Notes",
        accessibilityLabel: "View Notes",
        accessibilityHint: "View all your saved notes",
        onPress: () => navigation.push("Notes"),
      }
    );
    if (audioUrl) {
      actions.push({
        key: "listen",
        icon: "volume-high-outline",
        label: "Listen",
        accessibilityLabel: "Play Audio",
        accessibilityHint: "Listen to this passage",
        onPress: () => void playAudio(),
      });
    }
    return actions;
  }, [audioUrl, handleOpenInBible, navigation, playAudio, showSelectFontSize]);

  const handleNote = useCallback(
    (startVerse: number, endVerse: number) => {
      if (!currentLocation) return;
      const existing = chapterNotes.find(
        (n) => n.startVerse <= endVerse && n.endVerse >= startVerse
      );
      if (existing) {
        setPreviewNote(existing);
      } else {
        navigation.navigate("NoteEditor", {
          bookId: currentLocation.bookId,
          chapter: currentLocation.chapter,
          startVerse,
          endVerse,
        });
      }
    },
    [chapterNotes, currentLocation, navigation]
  );

  return (
    <>
      <SafeAreaView style={themedStyles.screen} edges={["left", "right"]}>
        {isLoading && !hasLoadedCurrentPassage ? (
          <View style={themedStyles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.text} />
          </View>
        ) : (
          <>
            <ReadScrollView
              showMemoryButton={shouldShowMemoryButton}
              heading={heading}
              passageIndex={passageIndex}
              showPreviousPassageButton={passages.length > 1}
              canGoToPreviousPassage={passageIndex > 0}
              isNavigatingPassages={isNavigatingPassages}
              onPreviousPassage={handlePreviousPassage}
              onNextPassage={handleNextPassage}
              hasNextPassage={passageIndex < passages.length - 1}
              miniPlayerHeight={miniPlayerHeight}
              bottomInset={insets.bottom}
              onScrollDirectionChange={handleScrollDirection}
              bookId={currentLocation?.bookId}
              chapter={currentLocation?.chapter}
              onNote={currentLocation ? handleNote : undefined}
              noteLookup={noteLookup}
            />
            <PassageToolbar actions={toolbarActions} visible={toolbarVisible} />
          </>
        )}
      </SafeAreaView>
      {previewNote && (
        <NotePreviewPopup
          text={previewNote.text}
          reference={formatVerseReference(
            previewNote.bookId,
            previewNote.chapter,
            previewNote.startVerse,
            previewNote.endVerse
          )}
          onEdit={() => {
            const note = previewNote;
            // eslint-disable-next-line unicorn/no-null
            setPreviewNote(null);
            navigation.navigate("NoteEditor", {
              bookId: note.bookId,
              chapter: note.chapter,
              startVerse: note.startVerse,
              endVerse: note.endVerse,
              noteId: note.id,
              initialText: note.text,
            });
          }}
          onDismiss={() => {
            // eslint-disable-next-line unicorn/no-null
            setPreviewNote(null);
          }}
        />
      )}
    </>
  );
};

/* eslint-enable react/prop-types */
