import { configureStore } from "@reduxjs/toolkit";
import { esvReducer } from "src/redux/esvSlice";
import { readingPlanReducer } from "src/redux/readingPlanSlice";
import { settingsReducer } from "src/redux/settingsSlice";
import { podcastReducer } from "src/redux/podcastSlice";
import { memoryReducer } from "src/redux/memorySlice";

export const store = configureStore({
  reducer: {
    esv: esvReducer,
    readingPlan: readingPlanReducer,
    settings: settingsReducer,
    podcast: podcastReducer,
    memory: memoryReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
