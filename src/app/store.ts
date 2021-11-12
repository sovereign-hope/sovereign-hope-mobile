import { configureStore } from "@reduxjs/toolkit";
import { esvReducer } from "src/redux/esvSlice";
import { readingPlanReducer } from "src/redux/readingPlanSlice";

export const store = configureStore({
  reducer: {
    esv: esvReducer,
    readingPlan: readingPlanReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
