import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import { parse } from "node-html-parser";
import { Passage } from "src/app/utils";
import { getPassageFromEsvApi } from "./esvSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface MemoryState {
  currentPassage?: string;
  isLoading: boolean;
  isSignout: boolean;
  hasError: boolean;
}

const initialState: MemoryState = {
  currentPassage: undefined,
  isLoading: false,
  isSignout: false,
  hasError: false,
};

export const getMemoryPassageText = createAsyncThunk(
  "memory/getMemoryPassageText",
  async ({ passage }: { passage: Passage }) => {
    try {
      const storedMemoryState = await AsyncStorage.getItem(
        `@memoryState-${passage.book}-${passage.startChapter}-${passage.startVerse}-${passage.endChapter}-${passage.endVerse}`
      );

      if (
        storedMemoryState &&
        storedMemoryState.length > 0 &&
        storedMemoryState !== '""'
      ) {
        const parsedMemoryState = JSON.parse(storedMemoryState) as string;
        return parsedMemoryState;
      }

      const passageHtml = await getPassageFromEsvApi({
        passage,
        includeFootnotes: false,
        includeVerseNumbers: false,
      });
      if (!passageHtml) {
        return;
      }
      const parsedHtml = parse(passageHtml.passages[0]);
      const passageLines = parsedHtml.querySelectorAll("p");
      const passageLineTextArray = passageLines.map((line) => line.text);
      const passageLineText = passageLineTextArray.slice(0, -1).join(" ");

      try {
        const jsonValue = JSON.stringify(passageLineText);
        await AsyncStorage.setItem(
          `@memoryState-${passage.book}-${passage.startChapter}-${passage.startVerse}-${passage.endChapter}-${passage.endVerse}`,
          jsonValue
        );
      } catch (error) {
        console.error(error);
      }

      return passageLineText;
    } catch (error) {
      console.error(error);
    }
  }
);

export const storeMemoryPassageForWeek = createAsyncThunk(
  "memory/storeMemoryPassageForWeek",
  async (args, { getState }) => {
    try {
      const state = getState() as RootState;
      const jsonValue = JSON.stringify(state.memory.currentPassage);
      await AsyncStorage.setItem(`@memoryState`, jsonValue);
    } catch (error) {
      console.error(error);
    }
    return true;
  }
);

export const memorySlice = createSlice({
  name: "memory",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // getPassageText
    builder.addCase(getMemoryPassageText.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getMemoryPassageText.fulfilled, (state, action) => {
      state.currentPassage = action.payload || undefined;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(getMemoryPassageText.rejected, (state) => {
      state.currentPassage = undefined;
      state.isLoading = false;
      state.hasError = true;
    });
  },
});

export const selectCurrentPassage = (state: RootState): string | undefined =>
  state.memory.currentPassage;
export const selectMemoryAcronym = (state: RootState): string | undefined => {
  // Extract first letter and punctuation from every word in the memory passage and capitalize
  const acronym = state.memory.currentPassage
    ?.replace(/([^\p{L}\s]*\p{L})\p{L}*/gu, "$1")
    .toUpperCase();
  return acronym;
};
export const selectError = (state: RootState): boolean => state.memory.hasError;
export const selectIsLoading = (state: RootState): boolean =>
  state.memory.isLoading;

export const memoryReducer = memorySlice.reducer;
