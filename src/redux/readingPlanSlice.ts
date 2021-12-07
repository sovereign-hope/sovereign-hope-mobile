import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getDayInWeek, getWeekNumber } from "src/app/utils";

export interface ReadingPlanState {
  readingPlan?: ReadingPlan;
  readingPlanProgressState?: ReadingPlanProgressState;
  isLoading: boolean;
  isSignout: boolean;
  hasError: boolean;
}

export interface ReadingPlanDay {
  reading: Array<string>;
  memory: Array<string>;
  isComplete: boolean;
  weekIndex?: number;
}

export interface ReadingPlanWeek {
  days: Array<ReadingPlanDay>;
}

export interface ReadingPlan {
  weeks: Array<ReadingPlanWeek>;
}

export interface ReadingPlanProgressState {
  weeks: Array<{
    days: Array<{
      isCompleted: boolean;
    }>;
  }>;
}

const initialState: ReadingPlanState = {
  readingPlan: undefined,
  isLoading: false,
  isSignout: false,
  hasError: false,
};

export const getReadingPlan = createAsyncThunk(
  "readingPlan/getReadingPlan",
  async () => {
    try {
      const db = getFirestore();
      const today = new Date();
      const year = today.getFullYear();
      const docRef = doc(db, "readingPlans", year.toString());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as ReadingPlan;
      }
    } catch (error) {
      console.log("error", error);
    }
    return { weeks: [] };
  }
);

export const storeReadingPlanProgressState = createAsyncThunk(
  "readingPlan/storeReadingPlanProgressState",
  async (readingPlanState: ReadingPlanProgressState) => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const jsonValue = JSON.stringify(readingPlanState);
      await AsyncStorage.setItem(`@readingPlanState${year}`, jsonValue);
    } catch (error) {
      console.error(error);
    }
    return readingPlanState;
  }
);

export const getReadingPlanProgressState = createAsyncThunk(
  "readingPlan/getReadingPlanProgressState",
  async () => {
    const blankState = {
      // eslint-disable-next-line unicorn/new-for-builtins
      weeks: Array(52).fill({
        // eslint-disable-next-line unicorn/new-for-builtins
        days: Array(7).fill({
          isCompleted: false,
        }),
      }),
    };

    try {
      const today = new Date();
      const year = today.getFullYear();
      const jsonValue = await AsyncStorage.getItem(`@readingPlanState${year}`);
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
    // getReadingPlan
    builder.addCase(getReadingPlan.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getReadingPlan.fulfilled, (state, action) => {
      state.readingPlan = action.payload || undefined;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(getReadingPlan.rejected, (state) => {
      state.readingPlan = undefined;
      state.isLoading = false;
      state.hasError = true;
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

export const selectReadingPlan = (state: RootState): ReadingPlan | undefined =>
  state.readingPlan.readingPlan;

export const selectDailyReadingPlan = (
  state: RootState
): ReadingPlanDay | undefined => {
  const currentWeekIndex = getWeekNumber(new Date())[1] - 1;
  const currentDayIndex = getDayInWeek() - 1;
  const currentWeek = state.readingPlan.readingPlan?.weeks[
    currentWeekIndex
  ] ?? { days: [] };
  const isEndOfWeek = currentDayIndex > currentWeek.days.length - 1;

  return currentWeek.days[
    isEndOfWeek ? currentWeek.days.length - 1 : currentDayIndex
  ];
};

export const selectDailyReadingPlanProgress = (state: RootState): boolean => {
  const currentWeekIndex = getWeekNumber(new Date())[1] - 1;
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

export const readingPlanReducer = readingPlanSlice.reducer;
