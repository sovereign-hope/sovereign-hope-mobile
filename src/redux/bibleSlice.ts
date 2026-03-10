import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RootState } from "src/app/store";
import type { BibleLocation } from "src/types/bible";
import { DEFAULT_BIBLE_LOCATION } from "src/types/bible";
import { getPassageFromEsvApi } from "src/redux/esvSlice";
import type { EsvResponse } from "src/redux/esvSlice";
import { getBookById } from "src/constants/bibleBooks";

const STORAGE_KEY_LAST_READ = "@bible/lastReadLocation";

export interface BibleState {
  currentLocation: BibleLocation;
  lastReadLocation: BibleLocation;
  isLoading: boolean;
  hasError: boolean;
  /** The ESV response for the current browse-mode chapter */
  currentChapter?: EsvResponse;
}

const initialState: BibleState = {
  currentLocation: DEFAULT_BIBLE_LOCATION,
  lastReadLocation: DEFAULT_BIBLE_LOCATION,
  isLoading: false,
  hasError: false,
  currentChapter: undefined,
};

/**
 * Fetch a Bible chapter for browse mode and persist the location.
 */
export const fetchBibleChapter = createAsyncThunk(
  "bible/fetchChapter",
  async (location: BibleLocation) => {
    const book = getBookById(location.bookId);
    if (!book) {
      throw new Error(`Unknown book ID: ${location.bookId}`);
    }

    // Build a minimal Passage for the existing ESV API function
    const chapter = String(location.chapter);
    const passage = {
      book: book.name,
      startChapter: chapter,
      endChapter: chapter,
      startVerse: "",
      endVerse: "",
      isMemory: false,
      heading: "",
    };

    const response = await getPassageFromEsvApi({
      passage,
      includeFootnotes: true,
      includeVerseNumbers: true,
    });

    // Persist last-read location (fire-and-forget to avoid blocking navigation)
    void AsyncStorage.setItem(STORAGE_KEY_LAST_READ, JSON.stringify(location));

    return { location, response };
  }
);

/**
 * Restore the last-read Bible location from AsyncStorage.
 */
export const restoreLastReadLocation = createAsyncThunk(
  "bible/restoreLastRead",
  async (): Promise<BibleLocation> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_LAST_READ);
      if (stored) {
        const parsed = JSON.parse(stored) as BibleLocation;
        const book = getBookById(parsed.bookId);
        if (
          book &&
          typeof parsed.chapter === "number" &&
          parsed.chapter >= 1 &&
          parsed.chapter <= book.chapterCount
        ) {
          return parsed;
        }
      }
    } catch {
      // Fall through to default
    }
    return DEFAULT_BIBLE_LOCATION;
  }
);

export const bibleSlice = createSlice({
  name: "bible",
  initialState,
  reducers: {
    /** Set the current location without fetching (used for optimistic updates) */
    setCurrentLocation(state, action: PayloadAction<BibleLocation>) {
      state.currentLocation = action.payload;
    },
  },
  extraReducers: (builder) => {
    // fetchBibleChapter
    builder.addCase(fetchBibleChapter.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(fetchBibleChapter.fulfilled, (state, action) => {
      state.currentLocation = action.payload.location;
      state.lastReadLocation = action.payload.location;
      state.currentChapter = action.payload.response;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(fetchBibleChapter.rejected, (state) => {
      state.isLoading = false;
      state.hasError = true;
    });

    // restoreLastReadLocation
    builder.addCase(restoreLastReadLocation.fulfilled, (state, action) => {
      state.currentLocation = action.payload;
      state.lastReadLocation = action.payload;
    });
  },
});

export const { setCurrentLocation } = bibleSlice.actions;

// Selectors
export const selectBibleLocation = (state: RootState): BibleLocation =>
  state.bible.currentLocation;
export const selectBibleChapter = (state: RootState): EsvResponse | undefined =>
  state.bible.currentChapter;
export const selectBibleIsLoading = (state: RootState): boolean =>
  state.bible.isLoading;
export const selectBibleHasError = (state: RootState): boolean =>
  state.bible.hasError;

export const bibleReducer = bibleSlice.reducer;
