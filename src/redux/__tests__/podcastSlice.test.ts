import { configureStore } from "@reduxjs/toolkit";
import axios from "axios";
import * as rssParser from "react-native-rss-parser";
import { getEpisodes, podcastReducer } from "src/redux/podcastSlice";

jest.mock("axios", () => ({
  get: jest.fn(),
}));

jest.mock("react-native-rss-parser", () => ({
  parse: jest.fn(),
}));

const createTestStore = () =>
  configureStore({
    reducer: {
      podcast: podcastReducer,
    },
  });

describe("podcastSlice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores fetched episodes on success", async () => {
    const mockItems = [
      {
        title: "Episode 1",
        description: "Desc",
        enclosures: [
          { url: "https://example.com/episode.mp3", length: "1200" },
        ],
      },
    ];
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: "<rss />" });
    (rssParser.parse as jest.Mock).mockResolvedValueOnce({
      items: mockItems,
    });

    const store = createTestStore();
    const action = await store.dispatch(getEpisodes());

    expect(action.type).toBe(getEpisodes.fulfilled.type);
    expect(store.getState().podcast.episodes).toEqual(mockItems);
    expect(store.getState().podcast.hasError).toBe(false);
    expect(store.getState().podcast.isLoading).toBe(false);
  });

  it("marks state as error when podcast fetch fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (axios.get as jest.Mock).mockRejectedValueOnce(
      new Error("network failure")
    );

    const store = createTestStore();
    const action = await store.dispatch(getEpisodes());

    expect(action.type).toBe(getEpisodes.rejected.type);
    expect(store.getState().podcast.episodes).toBeUndefined();
    expect(store.getState().podcast.hasError).toBe(true);
    expect(store.getState().podcast.isLoading).toBe(false);

    errorSpy.mockRestore();
  });
});
