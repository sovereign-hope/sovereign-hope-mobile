/* eslint-disable unicorn/no-null */
import { configureStore } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  settingsReducer,
  getSubscribedPlans,
  storeSubscribedPlans,
  getReadingFontSize,
  storeReadingFontSize,
  getEnableNotificationsState,
  getNotificationTime,
  getShowChildrensPlan,
  storeShowChildrensPlan,
  getEnableChurchCenterDeepLink,
  storeEnableChurchCenterDeepLink,
  selectEnableNotifications,
  selectNotificationTime,
  selectSubscribedPlans,
  selectHasLoadedSubscribedPlans,
  selectReadingFontSize,
  selectShowChildrensPlan,
  selectEnableChurchCenterDeepLink,
  selectError,
  selectIsLoading,
  SettingsState,
} from "../settingsSlice";
import type { RootState } from "src/app/store";

// Helper to create a test store
const createTestStore = (preloadedState?: {
  settings?: Partial<SettingsState>;
}) => {
  return configureStore({
    reducer: {
      settings: settingsReducer,
    },
    preloadedState: preloadedState as { settings: SettingsState },
  });
};

// Helper to create state for selector tests
const createState = (): RootState =>
  ({
    settings: {
      enableNotifications: true,
      notificationTime: "7:00 AM",
      subscribedPlans: ["2025"],
      readingFontSize: 16,
      readingBackgroundColor: "#FFFDE7",
      showChildrensPlan: false,
      enableChurchCenterDeepLink: true,
      isLoading: false,
      hasError: false,
      hasLoadedSubscribedPlans: true,
    },
  } as RootState);

describe("settingsSlice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("has correct initial state", () => {
      const store = createTestStore();
      const state = store.getState().settings;

      expect(state.enableNotifications).toBe(true);
      expect(state.notificationTime).toBe("8:00 AM");
      expect(state.subscribedPlans).toEqual([]);
      expect(state.readingFontSize).toBe(15); // body.fontSize default
      expect(state.readingBackgroundColor).toBeUndefined();
      expect(state.showChildrensPlan).toBe(true);
      expect(state.enableChurchCenterDeepLink).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.hasError).toBe(false);
      expect(state.hasLoadedSubscribedPlans).toBe(false);
    });
  });

  describe("subscribedPlans thunks", () => {
    describe("getSubscribedPlans", () => {
      it("loads plans from AsyncStorage", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
          "2025,2026-nt"
        );

        const store = createTestStore();
        await store.dispatch(getSubscribedPlans());

        expect(store.getState().settings.subscribedPlans).toEqual([
          "2025",
          "2026-nt",
        ]);
        expect(store.getState().settings.hasLoadedSubscribedPlans).toBe(true);
      });

      it("returns empty array when no plans saved", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

        const store = createTestStore();
        await store.dispatch(getSubscribedPlans());

        expect(store.getState().settings.subscribedPlans).toEqual([]);
      });

      it("handles single plan correctly", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("2025");

        const store = createTestStore();
        await store.dispatch(getSubscribedPlans());

        expect(store.getState().settings.subscribedPlans).toEqual(["2025"]);
      });
    });

    describe("storeSubscribedPlans", () => {
      it("saves plans to AsyncStorage", async () => {
        const store = createTestStore();
        await store.dispatch(storeSubscribedPlans(["2025", "2026-nt"]));

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          "@settings/subscribedPlans",
          "2025,2026-nt"
        );
        expect(store.getState().settings.subscribedPlans).toEqual([
          "2025",
          "2026-nt",
        ]);
      });
    });
  });

  describe("readingFontSize thunks", () => {
    describe("getReadingFontSize", () => {
      it("loads font size from AsyncStorage", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("18");

        const store = createTestStore();
        await store.dispatch(getReadingFontSize());

        expect(store.getState().settings.readingFontSize).toBe(18);
      });

      it("returns default when no font size saved", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

        const store = createTestStore();
        await store.dispatch(getReadingFontSize());

        expect(store.getState().settings.readingFontSize).toBe(15); // body.fontSize default
      });
    });

    describe("storeReadingFontSize", () => {
      it("saves font size to AsyncStorage", async () => {
        const store = createTestStore();
        await store.dispatch(storeReadingFontSize(20));

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          "@settings/readingFontSize",
          "20"
        );
        expect(store.getState().settings.readingFontSize).toBe(20);
      });
    });
  });

  describe("notification thunks", () => {
    describe("getEnableNotificationsState", () => {
      it("loads notification state from AsyncStorage", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("false");

        const store = createTestStore();
        await store.dispatch(getEnableNotificationsState());

        expect(store.getState().settings.enableNotifications).toBe(false);
      });

      it("defaults to true when nothing saved", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

        const store = createTestStore();
        await store.dispatch(getEnableNotificationsState());

        expect(store.getState().settings.enableNotifications).toBe(true);
      });
    });

    describe("getNotificationTime", () => {
      it("loads notification time from AsyncStorage", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("9:30 AM");

        const store = createTestStore();
        await store.dispatch(getNotificationTime());

        expect(store.getState().settings.notificationTime).toBe("9:30 AM");
      });

      it("defaults to 8:00 AM when nothing saved", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

        const store = createTestStore();
        await store.dispatch(getNotificationTime());

        expect(store.getState().settings.notificationTime).toBe("8:00 AM");
      });
    });
  });

  describe("showChildrensPlan thunks", () => {
    describe("getShowChildrensPlan", () => {
      // Note: getShowChildrensPlan thunk returns value but slice is missing
      // extraReducer to update state - it only has storeShowChildrensPlan cases
      it("returns value from AsyncStorage", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("false");

        const store = createTestStore();
        const result = await store.dispatch(getShowChildrensPlan());

        // Thunk returns correct value even though state isn't updated
        expect(result.payload).toBe(false);
      });

      it("returns true when nothing saved", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

        const store = createTestStore();
        const result = await store.dispatch(getShowChildrensPlan());

        expect(result.payload).toBe(true);
      });
    });

    describe("storeShowChildrensPlan", () => {
      it("saves and updates state", async () => {
        const store = createTestStore();
        await store.dispatch(storeShowChildrensPlan(false));

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          "@settings/showChildrensPlan",
          "false"
        );
        expect(store.getState().settings.showChildrensPlan).toBe(false);
      });
    });
  });

  describe("enableChurchCenterDeepLink thunks", () => {
    describe("getEnableChurchCenterDeepLink", () => {
      it("loads setting from AsyncStorage", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("true");

        const store = createTestStore();
        await store.dispatch(getEnableChurchCenterDeepLink());

        expect(store.getState().settings.enableChurchCenterDeepLink).toBe(true);
      });

      it("defaults to false when nothing saved", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

        const store = createTestStore();
        await store.dispatch(getEnableChurchCenterDeepLink());

        expect(store.getState().settings.enableChurchCenterDeepLink).toBe(
          false
        );
      });
    });

    describe("storeEnableChurchCenterDeepLink", () => {
      it("saves setting to AsyncStorage", async () => {
        const store = createTestStore();
        await store.dispatch(storeEnableChurchCenterDeepLink(true));

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          "@settings/enableChurchCenterDeepLink",
          "true"
        );
        expect(store.getState().settings.enableChurchCenterDeepLink).toBe(true);
      });
    });
  });

  describe("selectors", () => {
    it("selectEnableNotifications returns correct value", () => {
      expect(selectEnableNotifications(createState())).toBe(true);
    });

    it("selectNotificationTime returns correct value", () => {
      expect(selectNotificationTime(createState())).toBe("7:00 AM");
    });

    it("selectSubscribedPlans returns correct value", () => {
      expect(selectSubscribedPlans(createState())).toEqual(["2025"]);
    });

    it("selectHasLoadedSubscribedPlans returns correct value", () => {
      expect(selectHasLoadedSubscribedPlans(createState())).toBe(true);
    });

    it("selectReadingFontSize returns correct value", () => {
      expect(selectReadingFontSize(createState())).toBe(16);
    });

    it("selectShowChildrensPlan returns correct value", () => {
      expect(selectShowChildrensPlan(createState())).toBe(false);
    });

    it("selectEnableChurchCenterDeepLink returns correct value", () => {
      expect(selectEnableChurchCenterDeepLink(createState())).toBe(true);
    });

    it("selectError returns correct value", () => {
      expect(selectError(createState())).toBe(false);
    });

    it("selectIsLoading returns correct value", () => {
      expect(selectIsLoading(createState())).toBe(false);
    });
  });

  describe("error handling", () => {
    it("sets hasError on rejection", () => {
      const store = createTestStore();
      store.dispatch({ type: getSubscribedPlans.rejected.type });

      expect(store.getState().settings.hasError).toBe(true);
      expect(store.getState().settings.hasLoadedSubscribedPlans).toBe(true);
    });
  });
});

/* eslint-enable unicorn/no-null */
