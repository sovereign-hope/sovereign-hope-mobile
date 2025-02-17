import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import axios from "axios";
import { routes } from "./esvRoutes.constants";
import { Passage } from "src/app/utils";

export interface EsvState {
  currentPassage?: EsvResponse;
  audioURL: string;
  isLoading: boolean;
  isSignout: boolean;
  hasError: boolean;
}

export interface EsvResponse {
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
  audioURL: "",
  isLoading: false,
  isSignout: false,
  hasError: false,
};

export const getPassageFromEsvApi = async ({
  passage,
  includeFootnotes,
  includeVerseNumbers = true,
}: {
  passage: Passage;
  includeFootnotes: boolean;
  includeVerseNumbers?: boolean;
}) => {
  try {
    const { book, startChapter, startVerse, endChapter, endVerse } = passage;
    const isPassageSingleChapter = startChapter === endChapter;
    const isPassageSingleVerse =
      isPassageSingleChapter && startVerse === endVerse;
    const startVerseString =
      !startVerse || Object.is(startVerse, Number.NaN)
        ? ""
        : `.${startVerse.toString()}`;
    const endVerseString =
      !endVerse || Object.is(endVerse, Number.NaN)
        ? ""
        : `.${endVerse.toString()}`;
    const startChapterString = Object.is(startChapter, Number.NaN)
      ? ""
      : startChapter;
    const endChapterString =
      Object.is(endChapter, Number.NaN) ||
      (isPassageSingleChapter && endVerseString === "")
        ? ""
        : endChapter;

    let query = `${book}${startChapterString}${startVerseString}`;
    if (!isPassageSingleChapter || !isPassageSingleVerse) {
      query = `${query}-${endChapterString}${endVerseString}`;
    }

    const response = await axios.get(
      routes.passageText(query, includeFootnotes, includeVerseNumbers)
    );
    const passageHtml = response.data as EsvResponse;

    const audioRegex = /\(.*https:\/\/audio.esv.org\/.*.mp3.*Listen.*\)/g;
    const listenTagMatches = passageHtml.passages[0].match(audioRegex);
    let listenTag = listenTagMatches ? listenTagMatches[0] : undefined;
    // Remove listen link since we've extracted it for the player
    passageHtml.passages[0] = passageHtml.passages[0].replaceAll(
      audioRegex,
      ""
    );
    if (listenTag) {
      listenTag = listenTag?.slice(1).slice(0, -1);
      listenTag = listenTag.replace("Listen", "");
      // eslint-disable-next-line unicorn/prefer-spread
      passageHtml.passages[0] = passageHtml.passages[0].concat(`${listenTag}`);
    }

    // Change ESV attribution
    const esvRegex = /\(.*http:\/\/www.esv.org.*ESV.*\)/g;
    const esvTagMatches = passageHtml.passages[0].match(esvRegex);
    let esvTag = esvTagMatches ? esvTagMatches[0] : undefined;
    passageHtml.passages[0] = passageHtml.passages[0].replaceAll(esvRegex, "");
    if (esvTag) {
      esvTag = esvTag?.slice(1).slice(0, -1);
      esvTag = esvTag.replace("ESV", "ESV Bible");
      passageHtml.passages[0] = `<h3>${esvTag}</h3>`.concat(
        passageHtml.passages[0]
      );
    }
    return passageHtml;
  } catch (error) {
    console.error(error);
  }
};

export const getPassageText = createAsyncThunk(
  "esv/getPassageText",
  getPassageFromEsvApi
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
export const selectAudioUrl = (state: RootState): string | undefined => {
  // Regex to match https://audio.esv.org/david-cochran-heath/mq/20001001-20001033.mp3
  const audioRegex = /https:\/\/audio.esv.org\/.*.mp3/g;
  // Extract audio url from passageHtml
  const audioUrl = state.esv.currentPassage?.passages[0].match(audioRegex);
  return audioUrl ? audioUrl[0] : undefined;
};
export const selectPassageHeader = (state: RootState): string | undefined =>
  state.esv.currentPassage?.canonical;
export const selectError = (state: RootState): boolean => state.esv.hasError;
export const selectIsLoading = (state: RootState): boolean =>
  state.esv.isLoading;

export const esvReducer = esvSlice.reducer;
