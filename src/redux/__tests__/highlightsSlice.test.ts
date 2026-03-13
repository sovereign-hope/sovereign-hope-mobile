import { configureStore } from "@reduxjs/toolkit";
import {
  highlightsReducer,
  setHighlights,
  addHighlight,
  removeHighlight,
  updateHighlightColor,
  selectAllHighlights,
  selectHighlightsForChapter,
  buildHighlightLookup,
} from "../highlightsSlice";
import type { HighlightsState } from "../highlightsSlice";
import type { Highlight } from "src/types/highlights";
import type { RootState } from "src/app/store";

const createTestStore = (preloadedState?: {
  highlights?: Partial<HighlightsState>;
}) => {
  return configureStore({
    reducer: { highlights: highlightsReducer },
    preloadedState: preloadedState
      ? {
          highlights: {
            highlights: [],
            ...preloadedState.highlights,
          },
        }
      : undefined,
  });
};

const makeHighlight = (overrides: Partial<Highlight> = {}): Highlight => ({
  id: "h1",
  bookId: "JHN",
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  color: "yellow",
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

describe("highlightsSlice", () => {
  describe("reducers", () => {
    it("starts with empty highlights", () => {
      const store = createTestStore();
      expect(store.getState().highlights.highlights).toEqual([]);
    });

    it("setHighlights replaces all highlights", () => {
      const store = createTestStore();
      const highlights = [makeHighlight(), makeHighlight({ id: "h2" })];
      store.dispatch(setHighlights(highlights));
      expect(store.getState().highlights.highlights).toEqual(highlights);
    });

    it("setHighlights overwrites existing data", () => {
      const store = createTestStore({
        highlights: { highlights: [makeHighlight()] },
      });
      const newHighlights = [makeHighlight({ id: "h99", color: "blue" })];
      store.dispatch(setHighlights(newHighlights));
      expect(store.getState().highlights.highlights).toEqual(newHighlights);
    });

    it("addHighlight appends a highlight", () => {
      const store = createTestStore({
        highlights: { highlights: [makeHighlight()] },
      });
      const newH = makeHighlight({ id: "h2", chapter: 4 });
      store.dispatch(addHighlight(newH));
      expect(store.getState().highlights.highlights).toHaveLength(2);
      expect(store.getState().highlights.highlights[1]).toEqual(newH);
    });

    it("removeHighlight filters out by id", () => {
      const store = createTestStore({
        highlights: {
          highlights: [
            makeHighlight({ id: "h1" }),
            makeHighlight({ id: "h2" }),
          ],
        },
      });
      store.dispatch(removeHighlight("h1"));
      expect(store.getState().highlights.highlights).toHaveLength(1);
      expect(store.getState().highlights.highlights[0].id).toBe("h2");
    });

    it("removeHighlight is a no-op for unknown id", () => {
      const store = createTestStore({
        highlights: { highlights: [makeHighlight()] },
      });
      store.dispatch(removeHighlight("unknown"));
      expect(store.getState().highlights.highlights).toHaveLength(1);
    });

    it("updateHighlightColor changes color and updatedAt", () => {
      const store = createTestStore({
        highlights: {
          highlights: [makeHighlight({ id: "h1", color: "yellow" })],
        },
      });
      store.dispatch(updateHighlightColor({ id: "h1", color: "blue" }));
      const h = store.getState().highlights.highlights[0];
      expect(h.color).toBe("blue");
      expect(h.updatedAt).toBeGreaterThan(1000);
    });

    it("updateHighlightColor is a no-op for unknown id", () => {
      const store = createTestStore({
        highlights: { highlights: [makeHighlight()] },
      });
      store.dispatch(updateHighlightColor({ id: "unknown", color: "green" }));
      expect(store.getState().highlights.highlights[0].color).toBe("yellow");
    });
  });

  describe("selectors", () => {
    it("selectAllHighlights returns all highlights", () => {
      const highlights = [makeHighlight(), makeHighlight({ id: "h2" })];
      const state = { highlights: { highlights } } as unknown as RootState;
      expect(selectAllHighlights(state)).toEqual(highlights);
    });

    it("selectHighlightsForChapter filters by book and chapter", () => {
      const highlights = [
        makeHighlight({ id: "h1", bookId: "JHN", chapter: 3 }),
        makeHighlight({ id: "h2", bookId: "JHN", chapter: 4 }),
        makeHighlight({ id: "h3", bookId: "GEN", chapter: 3 }),
      ];
      const state = { highlights: { highlights } } as unknown as RootState;
      const result = selectHighlightsForChapter(state, "JHN", 3);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("h1");
    });

    it("selectHighlightsForChapter returns empty for no matches", () => {
      const state = { highlights: { highlights: [] } } as unknown as RootState;
      expect(selectHighlightsForChapter(state, "JHN", 3)).toEqual([]);
    });
  });

  describe("buildHighlightLookup", () => {
    it("creates keys for single-verse highlight", () => {
      const highlights = [
        makeHighlight({
          bookId: "JHN",
          chapter: 3,
          startVerse: 16,
          endVerse: 16,
          color: "yellow",
        }),
      ];
      const lookup = buildHighlightLookup(highlights);
      expect(lookup).toEqual({ "JHN:3:16": "yellow" });
    });

    it("expands verse range into individual keys", () => {
      const highlights = [
        makeHighlight({
          bookId: "GEN",
          chapter: 1,
          startVerse: 1,
          endVerse: 3,
          color: "blue",
        }),
      ];
      const lookup = buildHighlightLookup(highlights);
      expect(lookup).toEqual({
        "GEN:1:1": "blue",
        "GEN:1:2": "blue",
        "GEN:1:3": "blue",
      });
    });

    it("handles multiple highlights, later ones overwrite overlaps", () => {
      const highlights = [
        makeHighlight({
          id: "h1",
          bookId: "JHN",
          chapter: 3,
          startVerse: 16,
          endVerse: 17,
          color: "yellow",
        }),
        makeHighlight({
          id: "h2",
          bookId: "JHN",
          chapter: 3,
          startVerse: 17,
          endVerse: 18,
          color: "green",
        }),
      ];
      const lookup = buildHighlightLookup(highlights);
      expect(lookup["JHN:3:16"]).toBe("yellow");
      expect(lookup["JHN:3:17"]).toBe("green"); // overwritten
      expect(lookup["JHN:3:18"]).toBe("green");
    });

    it("returns empty object for empty input", () => {
      expect(buildHighlightLookup([])).toEqual({});
    });
  });
});
