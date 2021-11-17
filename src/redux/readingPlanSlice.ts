import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export interface ReadingPlanState {
  readingPlan?: ReadingPlan;
  readingPlanProgressState?: ReadingPlanProgressState;
  isLoading: boolean;
  isSignout: boolean;
  hasError: boolean;
}

export interface ReadingPlanDay {
  studies: Array<string>;
  reflections: Array<string>;
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
      // TODO: Get the current year
      const docRef = doc(db, "readingPlans", "2022");
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
      const jsonValue = JSON.stringify(readingPlanState);
      await AsyncStorage.setItem("@readingPlanState", jsonValue);
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
      const jsonValue = await AsyncStorage.getItem("@readingPlanState");
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
export const selectReadingPlanProgressState = (
  state: RootState
): ReadingPlanProgressState | undefined =>
  state.readingPlan.readingPlanProgressState;
export const selectError = (state: RootState): boolean =>
  state.readingPlan.hasError;

export const readingPlanReducer = readingPlanSlice.reducer;
