import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { writeThroughReadingPlanProgress } from "src/services/syncWriteThrough";
import { getDayOfYearIndices } from "src/app/utils";
import { storeSubscribedPlans } from "./settingsSlice";

export interface ReadingPlanState {
  availablePlans: Array<ReadingPlan>;
  readingPlan?: ReadingPlan;
  readingPlanProgressState?: ReadingPlanProgressState;
  isLoading: boolean;
  isSignout: boolean;
  hasError: boolean;
  hasLoaded: boolean;
}

export interface ReadingPlanDay {
  reading: Array<string>;
  memory: {
    passage: string;
    heading: string;
  };
  isComplete: boolean; // This is only here as a convenience for mapping into ReadingPlanDay on the ReadinngPlan screen; should change it at somepoint and remove this to avoid confusion since it isn't availalbe elsewhere
  weekIndex?: number;
}

export interface ReadingPlanWeek {
  days: Array<ReadingPlanDay>;
}

export interface ReadingPlan {
  id: string;
  weeks: Array<ReadingPlanWeek>;
  title: string;
  description: string;
}

export interface ReadingPlanProgressState {
  weeks: Array<{
    days: Array<{
      isCompleted: boolean;
    }>;
  }>;
}

// Plan type utility functions
// Multi-year plans (like Two Year Bible) have a .1 suffix
const isMultiYearPlan = (planId: string): boolean => planId.endsWith(".1");

// Extract the year from a plan ID (e.g., "2025.1" -> 2025)
const getPlanYear = (planId: string): number =>
  Number.parseInt(planId.split(".")[0], 10);

// Get the equivalent plan ID for the current year (e.g., "2025.1" -> "2026.1" for 2026)
const getUpdatedPlanId = (planId: string, currentYear: number): string => {
  const parts = planId.split(".");
  return `${currentYear}.${parts[1]}`;
};

const initialState: ReadingPlanState = {
  availablePlans: [],
  readingPlan: undefined,
  isLoading: false,
  isSignout: false,
  hasError: false,
  hasLoaded: false,
};

export const getAvailablePlans = createAsyncThunk(
  "readingPlan/getAvailablePlans",
  async () => {
    try {
      const db = getFirestore();
      const collectionRef = collection(db, "readingPlans");
      const querySnapshot = await getDocs(collectionRef);

      if (!querySnapshot.empty) {
        const availablePlans: Array<ReadingPlan> = [];
        querySnapshot.docs.forEach((doc) => {
          // For testing next year
          // const currentYear = new Date().getFullYear() + 1;
          const currentYear = new Date().getFullYear();
          if (doc.id.includes(currentYear.toString())) {
            availablePlans.push(doc.data() as ReadingPlan);
          }
        });
        return availablePlans;
      }
    } catch (error) {
      console.log("error", error);
    }
    return [];
  }
);

export const getReadingPlan = createAsyncThunk(
  "readingPlan/getReadingPlan",
  async (_, { getState, dispatch }) => {
    try {
      const state = getState() as RootState;
      const today = new Date();
      const currentYear = today.getFullYear();
      let subscribedPlans = state.settings.subscribedPlans;

      if (subscribedPlans.length === 0 && currentYear > 2024) {
        return { id: "", weeks: [], title: "", description: "" };
      } else if (currentYear < 2025) {
        subscribedPlans = [currentYear.toString()];
      }

      // For now, we only allow one plan
      let subscribedPlan = subscribedPlans[0];
      const planYear = getPlanYear(subscribedPlan);

      // Handle year transition for multi-year plans (like Two Year Bible)
      // Auto-upgrade to current year's version when year changes
      if (isMultiYearPlan(subscribedPlan) && planYear < currentYear) {
        const newPlanId = getUpdatedPlanId(subscribedPlan, currentYear);

        // Update the subscription to the new year's plan
        void dispatch(storeSubscribedPlans([newPlanId]));
        subscribedPlan = newPlanId;
      }

      const db = getFirestore();
      const docRef = doc(db, "readingPlans", subscribedPlan);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const plan = docSnap.data() as ReadingPlan;
        return plan;
      }
    } catch (error) {
      console.log("error", error);
    }
    return { id: "", weeks: [], title: "", description: "" };
  }
);

export const storeReadingPlanProgressState = createAsyncThunk(
  "readingPlan/storeReadingPlanProgressState",
  async (readingPlanState: ReadingPlanProgressState, { getState }) => {
    const state = getState() as RootState;
    const currentYear = new Date().getFullYear();
    const subscribedPlans =
      currentYear > 2024 ? state.settings.subscribedPlans : ["2024"];

    if (subscribedPlans.length === 0 && currentYear > 2024) {
      return readingPlanState;
    }

    // For now, we only allow one plan
    let subscribedPlan = subscribedPlans[0];

    // For multi-year plans, use current year's plan ID for progress storage
    // This ensures year 2 of a Two Year Bible gets fresh progress
    if (isMultiYearPlan(subscribedPlan)) {
      subscribedPlan = getUpdatedPlanId(subscribedPlan, currentYear);
    }

    try {
      const jsonValue = JSON.stringify(readingPlanState);
      await AsyncStorage.setItem(
        `@readingPlanState${subscribedPlan}`,
        jsonValue
      );
      await writeThroughReadingPlanProgress(state, readingPlanState);
    } catch (error) {
      console.error(error);
    }
    return readingPlanState;
  }
);

export const getReadingPlanProgressState = createAsyncThunk(
  "readingPlan/getReadingPlanProgressState",
  async (_, { getState }) => {
    // Use Array.from with factory functions to create unique objects per week/day
    // (Array.fill creates shared references, causing data corruption when mutating)
    const blankState: ReadingPlanProgressState = {
      // 53 weeks to handle years with 53 weeks (day 365/366 falls in week 53)
      weeks: Array.from({ length: 53 }, () => ({
        days: Array.from({ length: 7 }, () => ({
          isCompleted: false,
        })),
      })),
    };

    const state = getState() as RootState;
    const subscribedPlans = state.settings.subscribedPlans;
    const currentYear = new Date().getFullYear();

    if (subscribedPlans.length === 0 && currentYear > 2024) {
      return blankState;
    }

    // For now, we only allow one plan
    let subscribedPlan = subscribedPlans[0] ?? currentYear.toString();

    // For multi-year plans, use current year's plan ID for progress storage
    if (isMultiYearPlan(subscribedPlan)) {
      subscribedPlan = getUpdatedPlanId(subscribedPlan, currentYear);
    }

    try {
      const jsonValue = await AsyncStorage.getItem(
        `@readingPlanState${subscribedPlan}`
      );
      return jsonValue
        ? (JSON.parse(jsonValue) as ReadingPlanProgressState)
        : blankState;
    } catch (error) {
      console.error(error);
    }
    return blankState;
  }
);

export const readingPlanSlice = createSlice({
  name: "readingPlan",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // getAvailablePlans
    builder.addCase(getAvailablePlans.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getAvailablePlans.fulfilled, (state, action) => {
      state.availablePlans = action.payload;
      state.isLoading = false;
      state.hasError = false;
      state.hasLoaded = true;
    });
    builder.addCase(getAvailablePlans.rejected, (state) => {
      state.availablePlans = [];
      state.isLoading = false;
      state.hasError = true;
      state.hasLoaded = true;
    });

    // getReadingPlan
    builder.addCase(getReadingPlan.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getReadingPlan.fulfilled, (state, action) => {
      state.readingPlan = action.payload || undefined;
      state.isLoading = false;
      state.hasError = false;
      state.hasLoaded = true;
    });
    builder.addCase(getReadingPlan.rejected, (state) => {
      state.readingPlan = undefined;
      state.isLoading = false;
      state.hasError = true;
      state.hasLoaded = true;
    });

    // storeReadingProgressPlanState
    builder.addCase(storeReadingPlanProgressState.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(
      storeReadingPlanProgressState.fulfilled,
      (state, action) => {
        state.readingPlanProgressState = action.payload || undefined;
        state.isLoading = false;
        state.hasError = false;
      }
    );
    builder.addCase(storeReadingPlanProgressState.rejected, (state) => {
      state.isLoading = false;
      state.hasError = true;
    });

    // getReadingPlanProgressState
    builder.addCase(getReadingPlanProgressState.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getReadingPlanProgressState.fulfilled, (state, action) => {
      state.readingPlanProgressState = action.payload || undefined;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(getReadingPlanProgressState.rejected, (state) => {
      state.readingPlan = undefined;
      state.isLoading = false;
      state.hasError = true;
    });
  },
});

export const selectAvailablePlans = (state: RootState): Array<ReadingPlan> =>
  state.readingPlan.availablePlans;

export const selectReadingPlan = (state: RootState): ReadingPlan | undefined =>
  state.readingPlan.readingPlan;

// Memoized selector to avoid unnecessary re-renders
export const selectWeekReadingPlan = createSelector(
  [
    (state: RootState) => state.readingPlan.readingPlan,
    (state: RootState) => state.readingPlan.readingPlanProgressState,
  ],
  (readingPlan, progressState): ReadingPlanWeek | undefined => {
    const { weekIndex } = getDayOfYearIndices(new Date());
    const currentWeek = readingPlan?.weeks[weekIndex] ?? {
      days: [],
    };

    return {
      days: currentWeek.days.map((day, index) => ({
        ...day,
        isComplete:
          progressState?.weeks[weekIndex]?.days[index]?.isCompleted ?? false,
      })),
    };
  }
);

export const selectDailyReadingPlan = (
  state: RootState
): ReadingPlanDay | undefined => {
  const { weekIndex, dayIndex } = getDayOfYearIndices(new Date());
  const currentWeek = state.readingPlan.readingPlan?.weeks[weekIndex] ?? {
    days: [],
  };
  const isEndOfWeek = dayIndex > currentWeek.days.length - 1;

  return currentWeek.days[isEndOfWeek ? currentWeek.days.length - 1 : dayIndex];
};

export const selectWeeklyReadingPlanProgress = createSelector(
  [(state: RootState) => state.readingPlan.readingPlanProgressState],
  (progressState): Array<boolean> => {
    const { weekIndex } = getDayOfYearIndices(new Date());
    const currentWeek = progressState?.weeks[weekIndex] ?? { days: [] };

    return currentWeek.days.map((day) => day.isCompleted);
  }
);

export const selectDailyReadingPlanProgress = (state: RootState): boolean => {
  const { weekIndex, dayIndex } = getDayOfYearIndices(new Date());
  const currentWeek = state.readingPlan.readingPlanProgressState?.weeks[
    weekIndex
  ] ?? { days: [] };
  const isEndOfWeek = dayIndex > currentWeek.days.length - 1;

  return currentWeek.days[isEndOfWeek ? currentWeek.days.length - 1 : dayIndex]
    ?.isCompleted;
};

export const selectReadingPlanProgressState = (
  state: RootState
): ReadingPlanProgressState | undefined =>
  state.readingPlan.readingPlanProgressState;

export const selectError = (state: RootState): boolean =>
  state.readingPlan.hasError;

export const selectIsLoading = (state: RootState): boolean =>
  state.readingPlan.isLoading;

export const readingPlanReducer = readingPlanSlice.reducer;
