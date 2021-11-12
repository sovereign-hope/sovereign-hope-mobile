import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export interface ReadingPlanState {
  readingPlan?: ReadingPlan;
  isLoading: boolean;
  isSignout: boolean;
  hasError: boolean;
}

export interface ReadingPlanDay {
  studies: Array<string>;
  reflections: Array<string>;
}

export interface ReadingPlanWeek {
  days: Array<ReadingPlanDay>;
}

export interface ReadingPlan {
  weeks: Array<ReadingPlanWeek>;
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
  },
});

export const selectReadingPlan = (state: RootState): ReadingPlan | undefined =>
  state.readingPlan.readingPlan;
export const selectError = (state: RootState): boolean =>
  state.readingPlan.hasError;

export const readingPlanReducer = readingPlanSlice.reducer;
