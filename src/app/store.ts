import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "src/redux/authSlice";
import { bibleReducer } from "src/redux/bibleSlice";
import { esvReducer } from "src/redux/esvSlice";
import { readingPlanReducer } from "src/redux/readingPlanSlice";
import { settingsReducer } from "src/redux/settingsSlice";
import { podcastReducer } from "src/redux/podcastSlice";
import { memoryReducer } from "src/redux/memorySlice";
import { notificationsReducer } from "src/redux/notificationsSlice";
import { commentaryReducer } from "src/redux/commentarySlice";
import { memberReducer } from "src/redux/memberSlice";
import { memoryAudioReducer } from "src/redux/memoryAudioSlice";
import { highlightsReducer } from "src/redux/highlightsSlice";
import { notesReducer } from "src/redux/notesSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    bible: bibleReducer,
    esv: esvReducer,
    readingPlan: readingPlanReducer,
    settings: settingsReducer,
    podcast: podcastReducer,
    memory: memoryReducer,
    memoryAudio: memoryAudioReducer,
    notifications: notificationsReducer,
    commentary: commentaryReducer,
    member: memberReducer,
    highlights: highlightsReducer,
    notes: notesReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
