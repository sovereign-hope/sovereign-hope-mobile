import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import axios from "axios";
import { routes } from "./esvRoutes.constants";

export interface EsvState {
  currentPassage?: EsvResponse;
  isLoading: boolean;
  isSignout: boolean;
  hasError: boolean;
}

interface EsvResponse {
  query: string;
  canonical: string;
  parsed: Array<Array<number>>;
  passage_meta: Array<{
    canonical: string;
    chapter_start: Array<number>;
    chapter_end: Array<number>;
    prev_verse: number;
    next_verse: number;
    prev_chapter: Array<number>;
    next_chapter: Array<number>;
  }>;
  passages: Array<string>;
}

const initialState: EsvState = {
  currentPassage: undefined,
  isLoading: false,
  isSignout: false,
  hasError: false,
};

export const getPassageText = createAsyncThunk(
  "esv/getPassageText",
  async ({
    book,
    startChapter,
    endChapter,
  }: {
    book: string;
    startChapter: number;
    endChapter: number;
  }) => {
    const response = await axios.post(
      routes.passageText(`${book} ${startChapter}-${endChapter}}`)
    );
    return response.data as EsvResponse;
  }
);

export const esvSlice = createSlice({
  name: "esv",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // getPassageText
    builder.addCase(getPassageText.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getPassageText.fulfilled, (state, action) => {
      state.currentPassage = action.payload || undefined;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(getPassageText.rejected, (state) => {
      state.currentPassage = undefined;
      state.isLoading = false;
      state.hasError = true;
    });
  },
});

export const selectCurrentPassage = (
  state: RootState
): EsvResponse | undefined => state.esv.currentPassage;
export const selectError = (state: RootState): boolean => state.esv.hasError;

export const esvReducer = esvSlice.reducer;
