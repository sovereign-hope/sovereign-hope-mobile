import React from "react";
import {
  render as rtlRender,
  RenderOptions,
  RenderAPI,
} from "@testing-library/react-native";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import type { RootState } from "src/app/store";

// Import reducers
import { esvReducer } from "src/redux/esvSlice";
import { authReducer } from "src/redux/authSlice";
import { readingPlanReducer } from "src/redux/readingPlanSlice";
import { settingsReducer } from "src/redux/settingsSlice";
import { podcastReducer } from "src/redux/podcastSlice";
import { memoryReducer } from "src/redux/memorySlice";
import { memoryAudioReducer } from "src/redux/memoryAudioSlice";
import { notificationsReducer } from "src/redux/notificationsSlice";
import { commentaryReducer } from "src/redux/commentarySlice";
import { memberReducer } from "src/redux/memberSlice";

const rootReducer = {
  esv: esvReducer,
  auth: authReducer,
  readingPlan: readingPlanReducer,
  settings: settingsReducer,
  podcast: podcastReducer,
  memory: memoryReducer,
  memoryAudio: memoryAudioReducer,
  notifications: notificationsReducer,
  commentary: commentaryReducer,
  member: memberReducer,
};

interface ExtendedRenderOptions extends Omit<RenderOptions, "wrapper"> {
  preloadedState?: Partial<RootState>;
}

function render(
  ui: React.ReactElement,
  { preloadedState, ...renderOptions }: ExtendedRenderOptions = {}
): RenderAPI & { store: ReturnType<typeof configureStore> } {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as RootState,
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return {
    store,
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Re-export everything
export * from "@testing-library/react-native";

// Override render method
export { render };
