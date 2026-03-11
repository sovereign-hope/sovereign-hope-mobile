import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "src/app/store";
import type {
  Highlight,
  HighlightColor,
  HighlightLookup,
} from "src/types/highlights";

export interface HighlightsState {
  highlights: Highlight[];
}

const initialState: HighlightsState = {
  highlights: [],
};

export const highlightsSlice = createSlice({
  name: "highlights",
  initialState,
  reducers: {
    setHighlights(state, action: PayloadAction<Highlight[]>) {
      state.highlights = action.payload;
    },
    addHighlight(state, action: PayloadAction<Highlight>) {
      state.highlights.push(action.payload);
    },
    removeHighlight(state, action: PayloadAction<string>) {
      state.highlights = state.highlights.filter(
        (h) => h.id !== action.payload
      );
    },
    updateHighlightColor(
      state,
      action: PayloadAction<{ id: string; color: HighlightColor }>
    ) {
      const highlight = state.highlights.find(
        (h) => h.id === action.payload.id
      );
      if (highlight) {
        highlight.color = action.payload.color;
        highlight.updatedAt = Date.now();
      }
    },
  },
});

export const {
  setHighlights,
  addHighlight,
  removeHighlight,
  updateHighlightColor,
} = highlightsSlice.actions;

// Selectors
export const selectAllHighlights = (state: RootState): Highlight[] =>
  state.highlights.highlights;

export const selectHighlightsForChapter = (
  state: RootState,
  bookId: string,
  chapter: number
): Highlight[] =>
  state.highlights.highlights.filter(
    (h) => h.bookId === bookId && h.chapter === chapter
  );

/**
 * Build a lookup map for a specific chapter: "BOOKID:chapter:verse" → color.
 * Expands ranges so every verse in a range is individually keyed.
 */
export const buildHighlightLookup = (
  highlights: Highlight[]
): HighlightLookup => {
  const lookup: HighlightLookup = {};
  for (const h of highlights) {
    for (let v = h.startVerse; v <= h.endVerse; v++) {
      lookup[`${h.bookId}:${h.chapter}:${v}`] = h.color;
    }
  }
  return lookup;
};

export const highlightsReducer = highlightsSlice.reducer;
