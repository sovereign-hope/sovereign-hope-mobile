import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import axios from "axios";
import { routes } from "./podcastRoutes.constants";
import * as rssParser from "react-native-rss-parser";

export interface PodcastState {
  episodes?: Array<rssParser.FeedItem>;
  isLoading: boolean;
  isSignout: boolean;
  hasError: boolean;
}

const initialState: PodcastState = {
  episodes: undefined,
  isLoading: false,
  isSignout: false,
  hasError: false,
};

export const getEpisodes = createAsyncThunk("podcast/getEpisodes", async () => {
  try {
    const response = await axios.get(routes.podcast());
    const bodyText = response.data as string;
    const feed = await rssParser.parse(bodyText);
    return feed.items;
  } catch (error) {
    console.error(error);
  }
});

export const podcastSlice = createSlice({
  name: "podcast",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // getEpisodes
    builder.addCase(getEpisodes.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getEpisodes.fulfilled, (state, action) => {
      state.episodes = action.payload || undefined;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(getEpisodes.rejected, (state) => {
      state.episodes = undefined;
      state.isLoading = false;
      state.hasError = true;
    });
  },
});

export const selectEpisodes = (
  state: RootState
): rssParser.FeedItem[] | undefined => state.podcast.episodes;
export const selectError = (state: RootState): boolean =>
  state.podcast.hasError;
export const selectIsLoading = (state: RootState): boolean =>
  state.podcast.isLoading;

export const podcastReducer = podcastSlice.reducer;
