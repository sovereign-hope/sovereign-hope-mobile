/* eslint-disable unicorn/no-null */
import { configureStore } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDocs, getDoc } from "firebase/firestore";
import {
  readingPlanReducer,
  getAvailablePlans,
  getReadingPlan,
  getReadingPlanProgressState,
  storeReadingPlanProgressState,
  selectAvailablePlans,
  selectReadingPlan,
  selectWeekReadingPlan,
  selectDailyReadingPlan,
  selectWeeklyReadingPlanProgress,
  selectDailyReadingPlanProgress,
  selectError,
  selectIsLoading,
  ReadingPlan,
  ReadingPlanProgressState,
  ReadingPlanState,
} from "../readingPlanSlice";
import { settingsReducer, SettingsState } from "../settingsSlice";
import type { RootState } from "src/app/store";

// Mock the utils to control week/day values
jest.mock("src/app/utils", () => ({
  getWeekNumber: jest.fn().mockReturnValue({ week: 1, year: 2025 }),
  getDayInWeek: jest.fn().mockReturnValue(1),
}));

// Get the mocked functions
import { getWeekNumber, getDayInWeek } from "src/app/utils";

const mockGetWeekNumber = getWeekNumber as jest.MockedFunction<
  typeof getWeekNumber
>;
const mockGetDayInWeek = getDayInWeek as jest.MockedFunction<
  typeof getDayInWeek
>;

// Helper to create a test store
const createTestStore = (preloadedState?: {
  readingPlan?: Partial<ReadingPlanState>;
  settings?: Partial<SettingsState>;
}) => {
  return configureStore({
    reducer: {
      readingPlan: readingPlanReducer,
      settings: settingsReducer,
    },
    preloadedState: preloadedState as {
      readingPlan: ReadingPlanState;
      settings: SettingsState;
    },
  });
};

// Sample test data
const mockReadingPlan: ReadingPlan = {
  id: "2025",
  title: "2025 Reading Plan",
  description: "Read through the New Testament",
  weeks: [
    {
      days: [
        {
          reading: ["Matthew 1:1-25", "Matthew 2:1-23"],
          memory: { passage: "Matthew 1:21", heading: "Jesus Saves" },
          isComplete: false,
        },
        {
          reading: ["Matthew 3:1-17"],
          memory: { passage: "Matthew 3:17", heading: "Beloved Son" },
          isComplete: false,
        },
        {
          reading: ["Matthew 4:1-25"],
          memory: { passage: "Matthew 4:4", heading: "Man Shall Not Live" },
          isComplete: false,
        },
        {
          reading: ["Matthew 5:1-48"],
          memory: { passage: "Matthew 5:16", heading: "Let Your Light Shine" },
          isComplete: false,
        },
        {
          reading: ["Matthew 6:1-34"],
          memory: { passage: "Matthew 6:33", heading: "Seek First" },
          isComplete: false,
        },
      ],
    },
    {
      days: [
        {
          reading: ["Matthew 7:1-29"],
          memory: { passage: "Matthew 7:7", heading: "Ask Seek Knock" },
          isComplete: false,
        },
      ],
    },
  ],
};

const mockProgressState: ReadingPlanProgressState = {
  weeks: Array.from({ length: 52 }, () => ({
    days: Array.from({ length: 7 }, () => ({ isCompleted: false })),
  })),
};

// Helper to create state with plan for selector tests
const createStateWithPlan = (): RootState =>
  ({
    readingPlan: {
      availablePlans: [mockReadingPlan],
      readingPlan: mockReadingPlan,
      readingPlanProgressState: {
        weeks: Array.from({ length: 52 }, (_, weekIndex) => ({
          days: Array.from({ length: 7 }, (_, dayIndex) => ({
            isCompleted: weekIndex === 0 && dayIndex < 2,
          })),
        })),
      },
      isLoading: false,
      hasError: false,
      hasLoaded: true,
    },
    settings: { subscribedPlans: ["2025"] },
  } as RootState);

describe("readingPlanSlice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default values
    mockGetWeekNumber.mockReturnValue({
      week: 1,
      year: 2025,
      isStartOfNewYear: false,
    });
    mockGetDayInWeek.mockReturnValue(1);
  });

  describe("initial state", () => {
    it("has correct initial state", () => {
      const store = createTestStore();
      const state = store.getState().readingPlan;

      expect(state.availablePlans).toEqual([]);
      expect(state.readingPlan).toBeUndefined();
      expect(state.readingPlanProgressState).toBeUndefined();
      expect(state.isLoading).toBe(false);
      expect(state.hasError).toBe(false);
      expect(state.hasLoaded).toBe(false);
    });
  });

  describe("getAvailablePlans thunk", () => {
    it("sets loading state when pending", () => {
      const store = createTestStore();
      store.dispatch({ type: getAvailablePlans.pending.type });

      expect(store.getState().readingPlan.isLoading).toBe(true);
      expect(store.getState().readingPlan.hasError).toBe(false);
    });

    it("stores plans and sets hasLoaded on success", async () => {
      (getDocs as jest.Mock).mockResolvedValueOnce({
        empty: false,
        docs: [
          { id: "2025", data: () => mockReadingPlan },
          { id: "2024", data: () => ({ id: "2024", title: "Old Plan" }) },
        ],
      });

      const store = createTestStore();
      await store.dispatch(getAvailablePlans());

      const state = store.getState().readingPlan;
      expect(state.availablePlans).toHaveLength(1);
      expect(state.availablePlans[0].id).toBe("2025");
      expect(state.isLoading).toBe(false);
      expect(state.hasLoaded).toBe(true);
    });

    it("sets hasError on rejection", () => {
      const store = createTestStore();
      store.dispatch({ type: getAvailablePlans.rejected.type });

      expect(store.getState().readingPlan.hasError).toBe(true);
      expect(store.getState().readingPlan.hasLoaded).toBe(true);
    });
  });

  describe("getReadingPlan thunk", () => {
    it("fetches plan from Firestore when subscribed", async () => {
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockReadingPlan,
      });

      const store = createTestStore({
        settings: {
          subscribedPlans: ["2025"],
        },
      });

      await store.dispatch(getReadingPlan());

      expect(store.getState().readingPlan.readingPlan).toEqual(mockReadingPlan);
      expect(store.getState().readingPlan.isLoading).toBe(false);
    });

    it("returns empty plan when no subscription and year > 2024", async () => {
      const store = createTestStore({
        settings: {
          subscribedPlans: [],
        },
      });

      await store.dispatch(getReadingPlan());

      const plan = store.getState().readingPlan.readingPlan;
      expect(plan?.id).toBe("");
      expect(plan?.weeks).toEqual([]);
    });
  });

  describe("getReadingPlanProgressState thunk", () => {
    it("loads progress from AsyncStorage", async () => {
      const savedProgress = {
        ...mockProgressState,
        weeks: mockProgressState.weeks.map((week, weekIndex) => ({
          days: week.days.map((day, dayIndex) => ({
            isCompleted: weekIndex === 0 && dayIndex === 0,
          })),
        })),
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(savedProgress)
      );

      const store = createTestStore({
        settings: {
          subscribedPlans: ["2025"],
        },
      });

      await store.dispatch(getReadingPlanProgressState());

      const state = store.getState().readingPlan;
      expect(state.readingPlanProgressState?.weeks[0].days[0].isCompleted).toBe(
        true
      );
    });

    it("returns blank state when no saved progress", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const store = createTestStore({
        settings: {
          subscribedPlans: ["2025"],
        },
      });

      await store.dispatch(getReadingPlanProgressState());

      const state = store.getState().readingPlan;
      expect(state.readingPlanProgressState?.weeks).toHaveLength(52);
      expect(state.readingPlanProgressState?.weeks[0].days[0].isCompleted).toBe(
        false
      );
    });
  });

  describe("storeReadingPlanProgressState thunk", () => {
    it("saves progress to AsyncStorage", async () => {
      const progressToSave: ReadingPlanProgressState = {
        ...mockProgressState,
        weeks: mockProgressState.weeks.map((week, weekIndex) => ({
          days: week.days.map((day, dayIndex) => ({
            isCompleted: weekIndex === 0 && dayIndex < 3,
          })),
        })),
      };

      const store = createTestStore({
        settings: {
          subscribedPlans: ["2025"],
        },
      });

      await store.dispatch(storeReadingPlanProgressState(progressToSave));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@readingPlanState2025",
        JSON.stringify(progressToSave)
      );
    });
  });

  describe("selectors", () => {
    describe("selectAvailablePlans", () => {
      it("returns available plans", () => {
        const state = createStateWithPlan();
        expect(selectAvailablePlans(state)).toEqual([mockReadingPlan]);
      });
    });

    describe("selectReadingPlan", () => {
      it("returns the current reading plan", () => {
        const state = createStateWithPlan();
        expect(selectReadingPlan(state)).toEqual(mockReadingPlan);
      });
    });

    describe("selectWeekReadingPlan", () => {
      it("returns current week with completion status", () => {
        mockGetWeekNumber.mockReturnValue({
          week: 1,
          year: 2025,
          isStartOfNewYear: false,
        });
        const state = createStateWithPlan();
        const week = selectWeekReadingPlan(state);

        expect(week?.days).toHaveLength(5);
        expect(week?.days[0].isComplete).toBe(true);
        expect(week?.days[1].isComplete).toBe(true);
        expect(week?.days[2].isComplete).toBe(false);
      });

      it("handles different weeks correctly", () => {
        mockGetWeekNumber.mockReturnValue({
          week: 2,
          year: 2025,
          isStartOfNewYear: false,
        });
        const state = createStateWithPlan();
        const week = selectWeekReadingPlan(state);

        expect(week?.days).toHaveLength(1);
        expect(week?.days[0].reading).toContain("Matthew 7:1-29");
      });
    });

    describe("selectDailyReadingPlan", () => {
      it("returns reading for current day", () => {
        mockGetWeekNumber.mockReturnValue({
          week: 1,
          year: 2025,
          isStartOfNewYear: false,
        });
        mockGetDayInWeek.mockReturnValue(1);
        const state = createStateWithPlan();
        const day = selectDailyReadingPlan(state);

        expect(day?.reading).toContain("Matthew 1:1-25");
        expect(day?.memory.passage).toBe("Matthew 1:21");
      });

      it("returns last day when past end of week", () => {
        mockGetWeekNumber.mockReturnValue({
          week: 1,
          year: 2025,
          isStartOfNewYear: false,
        });
        mockGetDayInWeek.mockReturnValue(7); // Saturday/Sunday (past 5 days)
        const state = createStateWithPlan();
        const day = selectDailyReadingPlan(state);

        // Should return the 5th day (last in week 1)
        expect(day?.reading).toContain("Matthew 6:1-34");
      });
    });

    describe("selectWeeklyReadingPlanProgress", () => {
      it("returns array of completion status for current week", () => {
        mockGetWeekNumber.mockReturnValue({
          week: 1,
          year: 2025,
          isStartOfNewYear: false,
        });
        const state = createStateWithPlan();
        const progress = selectWeeklyReadingPlanProgress(state);

        expect(progress).toHaveLength(7);
        expect(progress[0]).toBe(true);
        expect(progress[1]).toBe(true);
        expect(progress[2]).toBe(false);
      });
    });

    describe("selectDailyReadingPlanProgress", () => {
      it("returns completion status for current day", () => {
        mockGetWeekNumber.mockReturnValue({
          week: 1,
          year: 2025,
          isStartOfNewYear: false,
        });
        mockGetDayInWeek.mockReturnValue(1);
        const state = createStateWithPlan();

        expect(selectDailyReadingPlanProgress(state)).toBe(true);
      });

      it("returns false for incomplete day", () => {
        mockGetWeekNumber.mockReturnValue({
          week: 1,
          year: 2025,
          isStartOfNewYear: false,
        });
        mockGetDayInWeek.mockReturnValue(3);
        const state = createStateWithPlan();

        expect(selectDailyReadingPlanProgress(state)).toBe(false);
      });
    });

    describe("selectError", () => {
      it("returns error state", () => {
        const state = createStateWithPlan();
        expect(selectError(state)).toBe(false);
      });
    });

    describe("selectIsLoading", () => {
      it("returns loading state", () => {
        const state = createStateWithPlan();
        expect(selectIsLoading(state)).toBe(false);
      });
    });
  });
});

/* eslint-enable unicorn/no-null */
