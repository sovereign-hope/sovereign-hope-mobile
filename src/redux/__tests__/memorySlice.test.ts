// AsyncStorage.getItem returns null, not undefined - this is expected behavior
/* eslint-disable unicorn/no-null */
/* eslint-disable unicorn/no-useless-undefined */
import { configureStore } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  memoryReducer,
  getMemoryPassageText,
  storeMemoryPassageForWeek,
  selectCurrentPassage,
  selectMemoryAcronym,
  selectError,
  selectIsLoading,
  MemoryState,
} from "../memorySlice";
import type { RootState } from "src/app/store";

// Mock the ESV API call
jest.mock("../esvSlice", () => ({
  getPassageFromEsvApi: jest.fn(),
}));

import { getPassageFromEsvApi } from "../esvSlice";

const mockGetPassageFromEsvApi = getPassageFromEsvApi as jest.MockedFunction<
  typeof getPassageFromEsvApi
>;

// Helper to create a test store
const createTestStore = (preloadedState?: {
  memory?: Partial<MemoryState>;
}) => {
  return configureStore({
    reducer: {
      memory: memoryReducer,
    },
    preloadedState: preloadedState as { memory: MemoryState },
  });
};

describe("memorySlice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("has correct initial state", () => {
      const store = createTestStore();
      const state = store.getState().memory;

      expect(state.currentPassage).toBeUndefined();
      expect(state.isLoading).toBe(false);
      expect(state.hasError).toBe(false);
    });
  });

  describe("getMemoryPassageText thunk", () => {
    const testPassage = {
      book: "John",
      startChapter: "3",
      startVerse: "16",
      endChapter: "3",
      endVerse: "16",
      isMemory: true,
    };

    it("sets loading state when pending", () => {
      const store = createTestStore();
      store.dispatch({ type: getMemoryPassageText.pending.type });

      expect(store.getState().memory.isLoading).toBe(true);
      expect(store.getState().memory.hasError).toBe(false);
    });

    it("fetches and parses passage from ESV API", async () => {
      const htmlResponse = {
        query: "John 3:16",
        canonical: "John 3:16",
        parsed: [[43_003_016, 43_003_016]],
        passage_meta: [],
        passages: [
          '<p class="passage-text">For God so loved the world, that he gave his only Son.</p><p class="extra">(ESV)</p>',
        ],
      };

      mockGetPassageFromEsvApi.mockResolvedValueOnce(htmlResponse);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const store = createTestStore();
      await store.dispatch(getMemoryPassageText({ passage: testPassage }));

      const state = store.getState().memory;
      expect(state.currentPassage).toBe(
        "For God so loved the world, that he gave his only Son."
      );
      expect(state.isLoading).toBe(false);
      expect(state.hasError).toBe(false);
    });

    it("saves passage to AsyncStorage after fetching", async () => {
      const htmlResponse = {
        query: "John 3:16",
        canonical: "John 3:16",
        parsed: [[43_003_016, 43_003_016]],
        passage_meta: [],
        passages: ['<p>Test passage</p><p class="extra">(ESV)</p>'],
      };

      mockGetPassageFromEsvApi.mockResolvedValueOnce(htmlResponse);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const store = createTestStore();
      await store.dispatch(getMemoryPassageText({ passage: testPassage }));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@memoryState-John-3-16-3-16",
        JSON.stringify("Test passage")
      );
    });

    it("sets hasError on rejection", () => {
      const store = createTestStore();
      store.dispatch({ type: getMemoryPassageText.rejected.type });

      expect(store.getState().memory.hasError).toBe(true);
      expect(store.getState().memory.currentPassage).toBeUndefined();
    });

    it("handles API errors gracefully", async () => {
      mockGetPassageFromEsvApi.mockRejectedValueOnce(
        new Error("network failure")
      );
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const store = createTestStore();
      await store.dispatch(getMemoryPassageText({ passage: testPassage }));

      expect(store.getState().memory.currentPassage).toBeUndefined();
    });
  });

  describe("storeMemoryPassageForWeek thunk", () => {
    it("saves current passage to AsyncStorage", async () => {
      const store = createTestStore({
        memory: {
          currentPassage: "For God so loved the world",
          isLoading: false,
          isSignout: false,
          hasError: false,
        },
      } as RootState);

      await store.dispatch(storeMemoryPassageForWeek());

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@memoryState",
        JSON.stringify("For God so loved the world")
      );
    });
  });

  describe("selectors", () => {
    describe("selectCurrentPassage", () => {
      it("returns the current passage", () => {
        const state = {
          memory: {
            currentPassage: "For God so loved the world",
            isLoading: false,
            isSignout: false,
            hasError: false,
          },
        } as RootState;

        expect(selectCurrentPassage(state)).toBe("For God so loved the world");
      });

      it("returns undefined when no passage", () => {
        const state = {
          memory: {
            currentPassage: undefined,
            isLoading: false,
            isSignout: false,
            hasError: false,
          },
        } as RootState;

        expect(selectCurrentPassage(state)).toBeUndefined();
      });
    });

    describe("selectMemoryAcronym", () => {
      it("extracts first letter of each word", () => {
        const state = {
          memory: {
            currentPassage: "For God so loved the world",
            isLoading: false,
            isSignout: false,
            hasError: false,
          },
        } as RootState;

        expect(selectMemoryAcronym(state)).toBe("FGSLTW");
      });

      it("handles punctuation correctly", () => {
        const state = {
          memory: {
            currentPassage:
              "For God so loved the world, that he gave his only Son.",
            isLoading: false,
            isSignout: false,
            hasError: false,
          },
        } as RootState;

        // The regex preserves punctuation attached to first letter
        const acronym = selectMemoryAcronym(state);
        expect(acronym).toContain("F");
        expect(acronym).toContain("G");
        expect(acronym).toContain("S");
      });

      it("returns undefined when no passage", () => {
        const state = {
          memory: {
            currentPassage: undefined,
            isLoading: false,
            isSignout: false,
            hasError: false,
          },
        } as RootState;

        expect(selectMemoryAcronym(state)).toBeUndefined();
      });

      it("handles quotes at start of words", () => {
        const state = {
          memory: {
            currentPassage: '"Truly, truly, I say to you"',
            isLoading: false,
            isSignout: false,
            hasError: false,
          },
        } as RootState;

        const acronym = selectMemoryAcronym(state);
        // Should include the first letters
        expect(acronym).toContain("T");
        expect(acronym).toContain("I");
        expect(acronym).toContain("S");
        expect(acronym).toContain("Y");
      });
    });

    describe("selectError", () => {
      it("returns error state", () => {
        const state = {
          memory: {
            currentPassage: undefined,
            isLoading: false,
            isSignout: false,
            hasError: true,
          },
        } as RootState;

        expect(selectError(state)).toBe(true);
      });
    });

    describe("selectIsLoading", () => {
      it("returns loading state", () => {
        const state = {
          memory: {
            currentPassage: undefined,
            isLoading: true,
            isSignout: false,
            hasError: false,
          },
        } as RootState;

        expect(selectIsLoading(state)).toBe(true);
      });
    });
  });
});

/* eslint-enable unicorn/no-null */
/* eslint-enable unicorn/no-useless-undefined */
