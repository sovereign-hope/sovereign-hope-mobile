import { createSelector, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "src/app/store";
import type { Note } from "src/types/notes";

export interface NotesState {
  notes: Note[];
}

const initialState: NotesState = {
  notes: [],
};

export const notesSlice = createSlice({
  name: "notes",
  initialState,
  reducers: {
    setNotes(state, action: PayloadAction<Note[]>) {
      state.notes = action.payload;
    },
    addNote(state, action: PayloadAction<Note>) {
      state.notes.push(action.payload);
    },
    removeNote(state, action: PayloadAction<string>) {
      state.notes = state.notes.filter((n) => n.id !== action.payload);
    },
    updateNoteText(state, action: PayloadAction<{ id: string; text: string }>) {
      const note = state.notes.find((n) => n.id === action.payload.id);
      if (note) {
        note.text = action.payload.text;
        note.updatedAt = Date.now();
      }
    },
  },
});

export const { setNotes, addNote, removeNote, updateNoteText } =
  notesSlice.actions;

// Selectors
export const selectAllNotes = (state: RootState): Note[] => state.notes.notes;

export const selectNotesForChapter = createSelector(
  [
    (state: RootState) => state.notes.notes,
    (_state: RootState, bookId: string) => bookId,
    (_state: RootState, _bookId: string, chapter: number) => chapter,
  ],
  (notes, bookId, chapter) =>
    notes.filter((n) => n.bookId === bookId && n.chapter === chapter)
);

/**
 * Build a lookup map for a specific chapter: "BOOKID:chapter:verse" → true.
 * Expands ranges so every verse in a range is individually keyed.
 */
const MAX_VERSE_RANGE = 200;

export const buildNoteLookup = (notes: Note[]): Record<string, boolean> => {
  const lookup: Record<string, boolean> = {};
  for (const n of notes) {
    if (n.endVerse - n.startVerse > MAX_VERSE_RANGE) continue;
    for (let v = n.startVerse; v <= n.endVerse; v++) {
      lookup[`${n.bookId}:${n.chapter}:${v}`] = true;
    }
  }
  return lookup;
};

export const notesReducer = notesSlice.reducer;
