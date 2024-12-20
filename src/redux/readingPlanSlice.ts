import { createAsyncThunk, createSlice, current } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { getDayInWeek, getWeekNumber } from "src/app/utils";

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
  async (_, { getState }) => {
    try {
      const state = getState() as RootState;
      const today = new Date();
      const year = today.getFullYear();
      // FOR TESTING NEXT YEAR
      // const year = 2025;
      let subscribedPlans = state.settings.subscribedPlans;
      if (subscribedPlans.length === 0 && year > 2024) {
        return { id: "", weeks: [], title: "", description: "" };
      } else if (year < 2025) {
        subscribedPlans = [year.toString()];
      }
      // For now, we only allow one plan
      const subscribedPlan = subscribedPlans[0];
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
    const subscribedPlan = subscribedPlans[0];
    try {
      const jsonValue = JSON.stringify(readingPlanState);
      await AsyncStorage.setItem(
        `@readingPlanState${subscribedPlan}`,
        jsonValue
      );
    } catch (error) {
      console.error(error);
    }
    return readingPlanState;
  }
);

export const getReadingPlanProgressState = createAsyncThunk(
  "readingPlan/getReadingPlanProgressState",
  async (_, { getState }) => {
    const blankState = {
      // eslint-disable-next-line unicorn/new-for-builtins
      weeks: Array(52).fill({
        // eslint-disable-next-line unicorn/new-for-builtins
        days: Array(7).fill({
          isCompleted: false,
        }),
      }),
    };

    const state = getState() as RootState;
    const subscribedPlans = state.settings.subscribedPlans;
    // FOR TESTING NEXT YEAR
    // const currentYear = 2025;
    const currentYear = new Date().getFullYear();
    if (subscribedPlans.length === 0 && currentYear > 2024) {
      return blankState;
    }
    // For now, we only allow one plan
    const subscribedPlan = subscribedPlans[0] ?? currentYear.toString();

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

export const selectWeekReadingPlan = (
  state: RootState
): ReadingPlanWeek | undefined => {
  // FOR TESTING NEXT YEAR
  // const currentWeekIndex = 0;
  const currentWeekIndex = getWeekNumber(new Date()).week - 1;
  const currentWeek = state.readingPlan.readingPlan?.weeks[
    currentWeekIndex
  ] ?? { days: [] };

  const plan = {
    days: currentWeek.days.map((day, index) => ({
      ...day,
      isComplete:
        state.readingPlan.readingPlanProgressState?.weeks[currentWeekIndex]
          .days[index].isCompleted ?? false,
    })),
  };
  return plan;
};

export const selectDailyReadingPlan = (
  state: RootState
): ReadingPlanDay | undefined => {
  // FOR TESTING NEXT YEAR
  // const currentWeekIndex = 0;
  // const currentDayIndex = 0;
  const currentWeekIndex = getWeekNumber(new Date()).week - 1;
  const currentDayIndex = getDayInWeek() - 1;
  const currentWeek = state.readingPlan.readingPlan?.weeks[
    currentWeekIndex
  ] ?? { days: [] };
  const isEndOfWeek = currentDayIndex > currentWeek.days.length - 1;

  return currentWeek.days[
    isEndOfWeek ? currentWeek.days.length - 1 : currentDayIndex
  ];
};

export const selectWeeklyReadingPlanProgress = (
  state: RootState
): Array<boolean> => {
  // FOR TESTING NEXT YEAR
  // const currentWeekIndex = 0;
  const currentWeekIndex = getWeekNumber(new Date()).week - 1;
  const currentWeek = state.readingPlan.readingPlanProgressState?.weeks[
    currentWeekIndex
  ] ?? { days: [] };

  return currentWeek.days.map((day) => day.isCompleted);
};

export const selectDailyReadingPlanProgress = (state: RootState): boolean => {
  // FOR TESTING NEXT YEAR
  // const currentWeekIndex = 0;
  const currentWeekIndex = getWeekNumber(new Date()).week - 1;
  // const currentDayIndex = 0;
  const currentDayIndex = getDayInWeek() - 1;
  const currentWeek = state.readingPlan.readingPlanProgressState?.weeks[
    currentWeekIndex
  ] ?? { days: [] };
  const isEndOfWeek = currentDayIndex > currentWeek.days.length - 1;

  return currentWeek.days[
    isEndOfWeek ? currentWeek.days.length - 1 : currentDayIndex
  ]?.isCompleted;
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
