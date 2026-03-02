import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import { parse } from "node-html-parser";
import { Passage } from "src/app/utils";
import { getPassageFromEsvApi } from "./esvSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface MemoryState {
  currentPassage?: string;
  audioUrl?: string;
  isLoading: boolean;
  isSignout: boolean;
  hasError: boolean;
}

const initialState: MemoryState = {
  currentPassage: undefined,
  audioUrl: undefined,
  isLoading: false,
  isSignout: false,
  hasError: false,
};

type MemoryPassagePayload = {
  passageText?: string;
  audioUrl?: string;
};

const getMemoryPassageStorageKey = (passage: Passage) =>
  `@memoryState-${passage.book}-${passage.startChapter}-${passage.startVerse}-${passage.endChapter}-${passage.endVerse}`;

const getMemoryAudioStorageKey = (passage: Passage) =>
  `@memoryAudioUrl-${passage.book}-${passage.startChapter}-${passage.startVerse}-${passage.endChapter}-${passage.endVerse}`;

export const getMemoryPassageText = createAsyncThunk(
  "memory/getMemoryPassageText",
  async ({ passage }: { passage: Passage }): Promise<MemoryPassagePayload> => {
    try {
      const [storedMemoryState, storedMemoryAudioUrl] = await Promise.all([
        AsyncStorage.getItem(getMemoryPassageStorageKey(passage)),
        AsyncStorage.getItem(getMemoryAudioStorageKey(passage)),
      ]);

      const parsedMemoryState = storedMemoryState
        ? (JSON.parse(storedMemoryState) as string)
        : undefined;
      const parsedMemoryAudioUrl = storedMemoryAudioUrl
        ? (JSON.parse(storedMemoryAudioUrl) as string)
        : undefined;
      if (parsedMemoryState && parsedMemoryAudioUrl) {
        return {
          passageText: parsedMemoryState,
          audioUrl: parsedMemoryAudioUrl,
        };
      }

      const passageHtml = await getPassageFromEsvApi({
        passage,
        includeFootnotes: false,
        includeVerseNumbers: false,
      });
      if (!passageHtml) {
        return {
          passageText: parsedMemoryState,
          audioUrl: parsedMemoryAudioUrl,
        };
      }

      const audioRegex = /https:\/\/audio\.esv\.org\/\S+?\.mp3/g;
      const audioMatches = passageHtml.passages[0].match(audioRegex);
      const extractedAudioUrl = audioMatches ? audioMatches[0] : undefined;
      const parsedHtml = parse(passageHtml.passages[0]);
      const passageLines = parsedHtml.querySelectorAll("p");
      const passageLineTextArray = passageLines.map((line) => line.text);
      const passageLineText = passageLineTextArray.slice(0, -1).join(" ");

      try {
        const writePromises: Array<Promise<void>> = [];
        writePromises.push(
          AsyncStorage.setItem(
            getMemoryPassageStorageKey(passage),
            JSON.stringify(passageLineText)
          )
        );
        if (extractedAudioUrl) {
          writePromises.push(
            AsyncStorage.setItem(
              getMemoryAudioStorageKey(passage),
              JSON.stringify(extractedAudioUrl)
            )
          );
        }
        await Promise.all(writePromises);
      } catch (error) {
        console.error(error);
      }

      return {
        passageText: passageLineText || parsedMemoryState,
        audioUrl: extractedAudioUrl || parsedMemoryAudioUrl,
      };
    } catch (error) {
      console.error(error);
      return {};
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
      state.currentPassage = action.payload.passageText || undefined;
      state.audioUrl = action.payload.audioUrl || undefined;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(getMemoryPassageText.rejected, (state) => {
      state.currentPassage = undefined;
      state.audioUrl = undefined;
      state.isLoading = false;
      state.hasError = true;
    });
  },
});

export const selectCurrentPassage = (state: RootState): string | undefined =>
  state.memory.currentPassage;
export const selectMemoryAudioUrl = (state: RootState): string | undefined =>
  state.memory.audioUrl;
export const selectMemoryAcronym = (state: RootState): string | undefined => {
  // Extract first letter and punctuation from every word in the memory passage and capitalize
  const acronym = state.memory.currentPassage
    ?.replace(/([^\p{L}\s]*\p{L})\p{L}*/gu, "$1")
    .toUpperCase()
    .replaceAll(/\s+/g, "");
  return acronym;
};
export const selectError = (state: RootState): boolean => state.memory.hasError;
export const selectIsLoading = (state: RootState): boolean =>
  state.memory.isLoading;

export const memoryReducer = memorySlice.reducer;
