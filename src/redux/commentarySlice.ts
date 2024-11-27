import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import axios from "axios";
import { routes } from "./bibleHubRoutes.constants";
import { Passage } from "src/app/utils";

export interface CommentaryState {
  currentPassageURL: string;
  commentaryHTML: string;
  isLoading: boolean;
  isSignout: boolean;
  hasError: boolean;
}

const initialState: CommentaryState = {
  currentPassageURL: "",
  commentaryHTML: "",
  isLoading: false,
  isSignout: false,
  hasError: false,
};

export const getCommentaryURLFromBibleHub = async ({
  passage,
}: {
  passage: Passage;
}) => {
  try {
    const { book, startChapter, startVerse } = passage;
    const startVerseString =
      !startVerse || Object.is(startVerse, Number.NaN)
        ? ".1"
        : `.${startVerse.toString()}`;

    const query = `${book}${
      Object.is(startChapter, Number.NaN) ? "" : startChapter
    }+${startVerseString}`;
    const response = await axios.get(routes.passageText(query));
    const passageHtml = response.data as string;

    // <a href="/commentaries/expositors/genesis/2.htm" title="Expositor's Bible">Expositor's</a>
    const expositorsRegex = /commentaries\/expositors\/.*?\.htm/g;
    const expositorsTagMatches = passageHtml.match(expositorsRegex);
    const expositorsTag = expositorsTagMatches
      ? expositorsTagMatches[0]
      : undefined;
    const commentaryURL = `https://biblehub.com/${expositorsTag}`;
    return commentaryURL;
  } catch (error) {
    console.error(error);
  }
};

export const getPassageFromBibleHub = async ({
  passage,
}: {
  passage: Passage;
}) => {
  try {
    const commentaryURL = await getCommentaryURLFromBibleHub({ passage });
    if (!commentaryURL) {
      return "";
    }
    const commentaryResponse = await axios.get(commentaryURL);
    let commentaryHtml = commentaryResponse.data as string;

    // Fix Links
    const externalLinkRegex = /href="\/\/.*?"/g;
    const externalLinkMatches = commentaryHtml.match(externalLinkRegex);
    externalLinkMatches?.forEach((match) => {
      const newLink = match.replace('href="', 'href="https:');
      commentaryHtml = commentaryHtml.replace(match, newLink);
    });
    const internalLinkRegex = /href="\/.*?"/g;
    const internalLinkMatches = commentaryHtml.match(internalLinkRegex);
    internalLinkMatches?.forEach((match) => {
      const newLink = match.replace('href="', 'href="https://biblehub.com');
      commentaryHtml = commentaryHtml.replace(match, newLink);
    });

    return commentaryHtml;
  } catch (error) {
    console.error(error);
  }
};

export const getPassageCommentary = createAsyncThunk(
  "commentary/getPassageCommentary",
  getPassageFromBibleHub
);

export const getPassageCommentaryURL = createAsyncThunk(
  "commentary/getPassageCommentaryURL",
  getCommentaryURLFromBibleHub
);

export const commentarySlice = createSlice({
  name: "commentary",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // getPassageCommentary
    builder.addCase(getPassageCommentary.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getPassageCommentary.fulfilled, (state, action) => {
      state.commentaryHTML = action.payload ?? "";
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(getPassageCommentary.rejected, (state) => {
      state.commentaryHTML = "";
      state.isLoading = false;
      state.hasError = true;
    });
    // getPassageCommentaryURL
    builder.addCase(getPassageCommentaryURL.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getPassageCommentaryURL.fulfilled, (state, action) => {
      state.currentPassageURL = action.payload ?? "";
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(getPassageCommentaryURL.rejected, (state) => {
      state.currentPassageURL = "";
      state.isLoading = false;
      state.hasError = true;
    });
  },
});

export const selectCurrentPassageCommentaryURL = (
  state: RootState
): string | undefined => state.commentary.currentPassageURL;
export const selectCurrentPassageCommentaryHTML = (
  state: RootState
): string | undefined => state.commentary.commentaryHTML;
export const selectError = (state: RootState): boolean =>
  state.commentary.hasError;
export const selectIsLoading = (state: RootState): boolean =>
  state.commentary.isLoading;

export const commentaryReducer = commentarySlice.reducer;
