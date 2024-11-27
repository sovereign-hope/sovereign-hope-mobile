import { configureStore } from "@reduxjs/toolkit";
import { esvReducer } from "src/redux/esvSlice";
import { readingPlanReducer } from "src/redux/readingPlanSlice";
import { settingsReducer } from "src/redux/settingsSlice";
import { podcastReducer } from "src/redux/podcastSlice";
import { memoryReducer } from "src/redux/memorySlice";
import { notificationsReducer } from "src/redux/notificationsSlice";
import { commentaryReducer } from "src/redux/commentarySlice";

export const store = configureStore({
  reducer: {
    esv: esvReducer,
    readingPlan: readingPlanReducer,
    settings: settingsReducer,
    podcast: podcastReducer,
    memory: memoryReducer,
    notifications: notificationsReducer,
    commentary: commentaryReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
