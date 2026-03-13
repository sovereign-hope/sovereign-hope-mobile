import { useCallback, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { selectAuthUser } from "src/redux/authSlice";
import {
  selectNotesForChapter,
  addNote as addNoteAction,
  removeNote as removeNoteAction,
  updateNoteText as updateNoteTextAction,
} from "src/redux/notesSlice";
import {
  setNoteDoc,
  updateNoteTextDoc,
  deleteNoteDoc,
} from "src/services/notes";
import type { Note } from "src/types/notes";
import { generateLocalId } from "src/utils/generateLocalId";

/** Fire-and-forget Firestore write with consistent error logging. */
const fireAndForget = (promise: Promise<unknown>): void => {
  void promise.catch((error) => {
    console.warn("[Notes] Firestore write-through failed:", error);
  });
};

export type NoteActionsResult = {
  chapterNotes: Note[];
  findNoteForVerse: (verse: number) => Note | undefined;
  createNote: (startVerse: number, endVerse: number, text: string) => Note;
  updateNote: (id: string, text: string) => void;
  deleteNote: (id: string) => void;
};

/**
 * Manages note CRUD operations (Redux + Firestore write-through)
 * for a specific book and chapter.
 */
export const useNoteActions = (
  bookId: string,
  chapter: number
): NoteActionsResult => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  const selectChapterNotes = useMemo(
    () => (state: Parameters<typeof selectNotesForChapter>[0]) =>
      selectNotesForChapter(state, bookId, chapter),
    [bookId, chapter]
  );
  const chapterNotes = useAppSelector(selectChapterNotes);

  const chapterNotesRef = useRef(chapterNotes);
  chapterNotesRef.current = chapterNotes;

  const findNoteForVerse = useCallback(
    (verse: number): Note | undefined =>
      chapterNotesRef.current.find(
        (n) =>
          n.bookId === bookId &&
          n.chapter === chapter &&
          verse >= n.startVerse &&
          verse <= n.endVerse
      ),
    [bookId, chapter]
  );

  const createNote = useCallback(
    (startVerse: number, endVerse: number, text: string): Note => {
      const now = Date.now();
      const note: Note = {
        id: generateLocalId(),
        bookId,
        chapter,
        startVerse: Math.min(startVerse, endVerse),
        endVerse: Math.max(startVerse, endVerse),
        text,
        createdAt: now,
        updatedAt: now,
      };

      dispatch(addNoteAction(note));

      if (user?.uid) {
        fireAndForget(setNoteDoc(user.uid, note));
      }

      return note;
    },
    [bookId, chapter, dispatch, user?.uid]
  );

  const updateNote = useCallback(
    (id: string, text: string) => {
      dispatch(updateNoteTextAction({ id, text }));
      if (user?.uid) {
        fireAndForget(updateNoteTextDoc(user.uid, id, text));
      }
    },
    [dispatch, user?.uid]
  );

  const deleteNote = useCallback(
    (id: string) => {
      dispatch(removeNoteAction(id));
      if (user?.uid) {
        fireAndForget(deleteNoteDoc(user.uid, id));
      }
    },
    [dispatch, user?.uid]
  );

  return {
    chapterNotes,
    findNoteForVerse,
    createNote,
    updateNote,
    deleteNote,
  };
};
