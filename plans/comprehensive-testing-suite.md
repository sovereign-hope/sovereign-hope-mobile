# feat: Focused Testing Suite - Critical User Flows

> **Created**: 2025-12-22
> **Revised**: 2025-12-22 (post-review)
> **Philosophy**: Test behavior, not implementation. Test what users care about.
> **Current Coverage**: ~3% (2 test files)
> **Target**: Critical paths covered with confidence

## Overview

A focused testing suite that verifies the app's core functionality works correctly. We test **user-visible behavior** and **critical business logic** - not Redux internals or framework code.

## What We're Testing (and Why)

| Feature              | Why It Matters                                    | Risk if Broken             |
| -------------------- | ------------------------------------------------- | -------------------------- |
| Passage parsing      | Core domain logic - if this breaks, nothing works | Users see wrong Bible text |
| Reading plan loading | Primary app purpose                               | App is useless             |
| Memory verses        | User feature they rely on                         | Lost memorization progress |
| ESV API integration  | External dependency                               | No Bible text at all       |
| Progress persistence | User data                                         | Lost reading progress      |
| Audio playback       | Key feature                                       | Silent readings            |

## What We're NOT Testing

- Redux action creators (they're auto-generated)
- Selectors that just return `state.slice.field`
- Initial state values (we see them when we use the store)
- Loading state transitions (implementation detail)
- React Navigation's routing code
- Component rendering (React does this)

---

## Implementation

### Phase 1: Fix Infrastructure & Test Core Logic

**Goal**: Get tests running and verify the heart of the app works.

#### 1.1 Fix Jest Configuration

The current config fails on RN 0.79. Create `jest.config.js`:

```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: [
    "@testing-library/jest-native/extend-expect",
    "<rootDir>/jest/setup.js",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|native-base|react-native-svg|@sentry/.*)",
  ],
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
    "^assets/(.*)$": "<rootDir>/assets/$1",
  },
  collectCoverageFrom: ["src/app/utils.ts", "src/redux/*.ts", "!src/**/*.d.ts"],
};
```

#### 1.2 Update Global Mocks (Lazy Approach)

**File**: `jest/setup.js`

Add only what's needed to make tests run:

```javascript
// Existing mocks (keep these)
jest.mock("react-native-reanimated");
jest.mock("@react-native/assets-registry/registry");
jest.mock("react-native/Libraries/EventEmitter/NativeEventEmitter");
jest.mock("expo-auth-session/providers/google");
jest.mock("expo-auth-session/providers/facebook");
jest.mock("@react-native-community/netinfo");
jest.mock("react-native-screens");
jest.mock("@react-navigation/native/lib/commonjs/useLinking.native");
jest.mock("expo-notifications");

// New: AsyncStorage mock (official)
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// New: Simple axios mock
jest.mock("axios");

// New: Track player - minimal mock
jest.mock("react-native-track-player", () => ({
  setupPlayer: jest.fn().mockResolvedValue(undefined),
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn().mockResolvedValue(undefined),
  add: jest.fn().mockResolvedValue(undefined),
  getPlaybackState: jest.fn().mockResolvedValue({ state: "none" }),
  usePlaybackState: jest.fn().mockReturnValue({ state: "none" }),
  useProgress: jest
    .fn()
    .mockReturnValue({ position: 0, duration: 0, buffered: 0 }),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  State: { None: "none", Playing: "playing", Paused: "paused" },
}));

// New: Sentry mock
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: (component) => component,
  captureException: jest.fn(),
}));

// New: SecureStore mock
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
```

#### 1.3 Update Test Utilities

**File**: `jest/testUtils.tsx`

Fix to support preloaded state:

```typescript
import React from "react";
import {
  render as rtlRender,
  RenderOptions,
} from "@testing-library/react-native";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import type { RootState } from "src/app/store";

// Import reducers
import esvReducer from "src/redux/esvSlice";
import readingPlanReducer from "src/redux/readingPlanSlice";
import settingsReducer from "src/redux/settingsSlice";
import podcastReducer from "src/redux/podcastSlice";
import memoryReducer from "src/redux/memorySlice";
import notificationsReducer from "src/redux/notificationsSlice";
import commentaryReducer from "src/redux/commentarySlice";

const rootReducer = {
  esv: esvReducer,
  readingPlan: readingPlanReducer,
  settings: settingsReducer,
  podcast: podcastReducer,
  memory: memoryReducer,
  notifications: notificationsReducer,
  commentary: commentaryReducer,
};

interface ExtendedRenderOptions extends Omit<RenderOptions, "wrapper"> {
  preloadedState?: Partial<RootState>;
}

export function renderWithStore(
  ui: React.ReactElement,
  { preloadedState, ...renderOptions }: ExtendedRenderOptions = {}
) {
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
export { renderWithStore as render };
```

#### 1.4 Test Passage Parsing (Critical Business Logic)

**File**: `src/app/__tests__/utils.test.ts`

This is the heart of the app - parsing Bible references correctly.

```typescript
import {
  parsePassageString,
  getWeekNumber,
  getDayInWeek,
  weekDateToDate,
} from "../utils";

describe("parsePassageString", () => {
  describe("single verse references", () => {
    it('parses "John 3:16"', () => {
      const result = parsePassageString("John 3:16");

      expect(result.book).toBe("John");
      expect(result.startChapter).toBe("3");
      expect(result.startVerse).toBe("16");
      expect(result.endVerse).toBe("16");
      expect(result.isMemory).toBe(false);
    });

    it('parses "Psalm 23:1"', () => {
      const result = parsePassageString("Psalm 23:1");

      expect(result.book).toBe("Psalm");
      expect(result.startChapter).toBe("23");
    });
  });

  describe("verse ranges", () => {
    it('parses "John 3:16-17" (same chapter)', () => {
      const result = parsePassageString("John 3:16-17");

      expect(result.startVerse).toBe("16");
      expect(result.endVerse).toBe("17");
      expect(result.startChapter).toBe("3");
      expect(result.endChapter).toBe("3");
    });

    it('parses "Genesis 1:1-2:3" (cross chapter)', () => {
      const result = parsePassageString("Genesis 1:1-2:3");

      expect(result.book).toBe("Genesis");
      expect(result.startChapter).toBe("1");
      expect(result.endChapter).toBe("2");
      expect(result.startVerse).toBe("1");
      expect(result.endVerse).toBe("3");
    });
  });

  describe("chapter references", () => {
    it('parses "John 3" (whole chapter)', () => {
      const result = parsePassageString("John 3");

      expect(result.book).toBe("John");
      expect(result.startChapter).toBe("3");
      expect(result.endChapter).toBe("3");
    });

    it('parses "Genesis 1-2" (chapter range)', () => {
      const result = parsePassageString("Genesis 1-2");

      expect(result.startChapter).toBe("1");
      expect(result.endChapter).toBe("2");
    });
  });

  describe("numbered books", () => {
    it('parses "1 John 1:1"', () => {
      const result = parsePassageString("1 John 1:1");
      expect(result.book).toBe("1 John");
    });

    it('parses "2 Chronicles 7:14"', () => {
      const result = parsePassageString("2 Chronicles 7:14");
      expect(result.book).toBe("2 Chronicles");
    });

    it('parses "1 Corinthians 13"', () => {
      const result = parsePassageString("1 Corinthians 13");
      expect(result.book).toBe("1 Corinthians");
    });
  });

  describe("multi-word books", () => {
    it('parses "Song of Solomon 1:1"', () => {
      const result = parsePassageString("Song of Solomon 1:1");
      expect(result.book).toBe("Song of Solomon");
    });
  });

  describe("with heading", () => {
    it("includes heading when provided", () => {
      const result = parsePassageString("John 3:16", "For God So Loved");
      expect(result.heading).toBe("For God So Loved");
    });

    it("heading is undefined when not provided", () => {
      const result = parsePassageString("John 3:16");
      expect(result.heading).toBeUndefined();
    });
  });
});

describe("getWeekNumber", () => {
  it("returns week 1 for January 1st", () => {
    const result = getWeekNumber(new Date("2026-01-01"));
    expect(result.week).toBe(1);
    expect(result.year).toBe(2026);
  });

  it("returns correct week for mid-year", () => {
    // June 15, 2026 should be around week 24-25
    const result = getWeekNumber(new Date("2026-06-15"));
    expect(result.week).toBeGreaterThan(20);
    expect(result.week).toBeLessThan(30);
  });

  it("handles year-end correctly", () => {
    const result = getWeekNumber(new Date("2026-12-31"));
    expect(result.week).toBeGreaterThan(50);
  });
});

describe("getDayInWeek", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 0 for Sunday", () => {
    jest.setSystemTime(new Date("2026-01-04")); // Sunday
    expect(getDayInWeek()).toBe(0);
  });

  it("returns 1 for Monday", () => {
    jest.setSystemTime(new Date("2026-01-05")); // Monday
    expect(getDayInWeek()).toBe(1);
  });

  it("returns 6 for Saturday", () => {
    jest.setSystemTime(new Date("2026-01-10")); // Saturday
    expect(getDayInWeek()).toBe(6);
  });
});

describe("weekDateToDate", () => {
  it("returns valid date string format", () => {
    const result = weekDateToDate(2026, 1, 1);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

#### Tasks - Phase 1

- [ ] Create `jest.config.js` with fixed transformIgnorePatterns
- [ ] Update `jest/setup.js` with minimal mocks
- [ ] Update `jest/testUtils.tsx` with preloadedState support
- [ ] Create `src/app/__tests__/utils.test.ts`
- [ ] Run `npm test` and verify all tests pass

---

### Phase 2: Test Critical User Flows

**Goal**: Verify the core features users depend on actually work.

#### 2.1 Reading Plan Loading

**File**: `src/redux/__tests__/readingPlanSlice.test.ts`

Test that reading plans load correctly from Firebase and persist properly.

```typescript
import { configureStore } from "@reduxjs/toolkit";
import readingPlanReducer, {
  getAvailablePlans,
  getReadingPlan,
  storeReadingPlanProgressState,
  getReadingPlanProgressState,
} from "../readingPlanSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
}));

import { getDoc, getDocs } from "firebase/firestore";

const createStore = () =>
  configureStore({
    reducer: { readingPlan: readingPlanReducer },
  });

describe("Reading Plan - User Flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("browsing available plans", () => {
    it("loads available plans from Firebase", async () => {
      const mockPlans = [
        { id: "nt-2026", name: "New Testament in a Year", duration: "1 year" },
        { id: "bible-1-year", name: "Bible in a Year", duration: "1 year" },
      ];

      (getDocs as jest.Mock).mockResolvedValueOnce({
        docs: mockPlans.map((plan) => ({
          id: plan.id,
          data: () => plan,
        })),
      });

      const store = createStore();
      await store.dispatch(getAvailablePlans());

      const state = store.getState().readingPlan;
      expect(state.availablePlans).toHaveLength(2);
      expect(state.availablePlans[0].name).toBe("New Testament in a Year");
    });

    it("handles Firebase errors gracefully", async () => {
      (getDocs as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      const store = createStore();
      await store.dispatch(getAvailablePlans());

      const state = store.getState().readingPlan;
      expect(state.availablePlansLoading).toBe(false);
      // App shouldn't crash - user sees error state
    });
  });

  describe("selecting a reading plan", () => {
    it("loads full plan data when user selects one", async () => {
      const mockPlan = {
        id: "nt-2026",
        name: "New Testament in a Year",
        weeks: [
          {
            weekNumber: 1,
            days: [
              { day: 1, passages: ["Matthew 1"] },
              { day: 2, passages: ["Matthew 2"] },
            ],
          },
        ],
      };

      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => mockPlan,
      });

      const store = createStore();
      await store.dispatch(getReadingPlan("nt-2026"));

      const state = store.getState().readingPlan;
      expect(state.readingPlan).toBeDefined();
      expect(state.readingPlan.weeks).toHaveLength(1);
      expect(state.readingPlan.weeks[0].days[0].passages).toContain(
        "Matthew 1"
      );
    });

    it("handles non-existent plan gracefully", async () => {
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => false,
      });

      const store = createStore();
      await store.dispatch(getReadingPlan("non-existent-plan"));

      const state = store.getState().readingPlan;
      expect(state.readingPlan).toBeNull();
    });
  });

  describe("reading progress persistence", () => {
    it("saves progress to AsyncStorage", async () => {
      const progress = {
        planId: "nt-2026",
        completedPassages: ["Matthew 1", "Matthew 2"],
        currentWeek: 1,
        currentDay: 3,
      };

      const store = createStore();
      await store.dispatch(storeReadingPlanProgressState(progress));

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const [key, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(JSON.parse(value)).toMatchObject(progress);
    });

    it("restores progress from AsyncStorage on app launch", async () => {
      const savedProgress = {
        planId: "nt-2026",
        completedPassages: ["Matthew 1"],
        currentWeek: 1,
        currentDay: 2,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(savedProgress)
      );

      const store = createStore();
      await store.dispatch(getReadingPlanProgressState());

      const state = store.getState().readingPlan;
      expect(state.readingPlanProgressState.completedPassages).toContain(
        "Matthew 1"
      );
    });

    it("handles corrupted storage gracefully", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        "invalid json{{{"
      );

      const store = createStore();

      // Should not throw
      await expect(
        store.dispatch(getReadingPlanProgressState())
      ).resolves.not.toThrow();
    });
  });
});
```

#### 2.2 ESV API Integration (Bible Text Loading)

**File**: `src/redux/__tests__/esvSlice.test.ts`

Test that Bible passages actually load from the ESV API.

```typescript
import { configureStore } from "@reduxjs/toolkit";
import axios from "axios";
import esvReducer, { getPassageText } from "../esvSlice";

const axiosMock = axios as jest.Mocked<typeof axios>;

const createStore = () =>
  configureStore({
    reducer: { esv: esvReducer },
  });

describe("ESV Bible Text - User Flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loading a passage", () => {
    it("fetches passage text from ESV API", async () => {
      const mockResponse = {
        passages: [
          '<p>"For God so loved the world, that he gave his only Son..."</p>',
        ],
        canonical: "John 3:16",
      };

      axiosMock.get.mockResolvedValueOnce({ data: mockResponse });

      const store = createStore();
      const passage = {
        book: "John",
        startChapter: "3",
        endChapter: "3",
        startVerse: "16",
        endVerse: "16",
        isMemory: false,
      };

      await store.dispatch(getPassageText(passage));

      const state = store.getState().esv;
      expect(state.currentPassage).toContain("For God so loved");
      expect(state.error).toBeNull();
    });

    it("handles network errors", async () => {
      axiosMock.get.mockRejectedValueOnce(new Error("Network error"));

      const store = createStore();
      const passage = {
        book: "John",
        startChapter: "3",
        endChapter: "3",
        startVerse: "16",
        endVerse: "16",
        isMemory: false,
      };

      await store.dispatch(getPassageText(passage));

      const state = store.getState().esv;
      expect(state.error).toBeDefined();
      expect(state.currentPassage).toBeNull();
    });

    it("handles invalid passage references", async () => {
      axiosMock.get.mockResolvedValueOnce({
        data: { passages: [], detail: "Passage not found" },
      });

      const store = createStore();
      const passage = {
        book: "InvalidBook",
        startChapter: "999",
        endChapter: "999",
        startVerse: "1",
        endVerse: "1",
        isMemory: false,
      };

      await store.dispatch(getPassageText(passage));

      const state = store.getState().esv;
      // Should handle gracefully, not crash
      expect(state.loading).toBe(false);
    });

    it("builds correct API query for multi-chapter passages", async () => {
      axiosMock.get.mockResolvedValueOnce({
        data: { passages: ["<p>Genesis text...</p>"] },
      });

      const store = createStore();
      const passage = {
        book: "Genesis",
        startChapter: "1",
        endChapter: "2",
        startVerse: "1",
        endVerse: "3",
        isMemory: false,
      };

      await store.dispatch(getPassageText(passage));

      expect(axiosMock.get).toHaveBeenCalled();
      const callUrl = axiosMock.get.mock.calls[0][0];
      // URL should contain the passage reference
      expect(callUrl).toContain("Genesis");
    });
  });
});
```

#### 2.3 Memory Verses

**File**: `src/redux/__tests__/memorySlice.test.ts`

Test that memory verses work correctly.

```typescript
import { configureStore } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import memoryReducer, {
  addMemoryVerse,
  removeMemoryVerse,
  getMemoryVerses,
  markVerseMemorized,
} from "../memorySlice";

const createStore = () =>
  configureStore({
    reducer: { memory: memoryReducer },
  });

describe("Memory Verses - User Flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("adding memory verses", () => {
    it("user can add a verse to memorize", async () => {
      const store = createStore();
      const verse = {
        reference: "Romans 8:28",
        text: "And we know that for those who love God all things work together for good...",
      };

      await store.dispatch(addMemoryVerse(verse));

      const state = store.getState().memory;
      expect(state.verses).toContainEqual(
        expect.objectContaining({
          reference: "Romans 8:28",
        })
      );
    });

    it("persists memory verses to storage", async () => {
      const store = createStore();
      const verse = {
        reference: "John 3:16",
        text: "For God so loved the world...",
      };

      await store.dispatch(addMemoryVerse(verse));

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe("loading saved memory verses", () => {
    it("loads verses from storage on app launch", async () => {
      const savedVerses = [
        { reference: "Romans 8:28", text: "...", memorized: false },
        { reference: "John 3:16", text: "...", memorized: true },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(savedVerses)
      );

      const store = createStore();
      await store.dispatch(getMemoryVerses());

      const state = store.getState().memory;
      expect(state.verses).toHaveLength(2);
    });
  });

  describe("tracking memorization progress", () => {
    it("user can mark a verse as memorized", async () => {
      const savedVerses = [
        { id: "1", reference: "Romans 8:28", text: "...", memorized: false },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(savedVerses)
      );

      const store = createStore();
      await store.dispatch(getMemoryVerses());
      await store.dispatch(markVerseMemorized("1"));

      const state = store.getState().memory;
      expect(state.verses[0].memorized).toBe(true);
    });
  });

  describe("removing verses", () => {
    it("user can remove a verse from their list", async () => {
      const store = createStore();

      // Add a verse first
      await store.dispatch(
        addMemoryVerse({
          reference: "John 3:16",
          text: "...",
        })
      );

      const stateAfterAdd = store.getState().memory;
      const verseId = stateAfterAdd.verses[0].id;

      await store.dispatch(removeMemoryVerse(verseId));

      const state = store.getState().memory;
      expect(state.verses).toHaveLength(0);
    });
  });
});
```

#### 2.4 Settings Persistence

**File**: `src/redux/__tests__/settingsSlice.test.ts`

Test that user settings are saved and restored.

```typescript
import { configureStore } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import settingsReducer, {
  setReadingFontSize,
  setEnableNotifications,
  storeSettings,
  retrieveSettings,
} from "../settingsSlice";

const createStore = () =>
  configureStore({
    reducer: { settings: settingsReducer },
  });

describe("Settings - User Flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("font size preference", () => {
    it("user can change reading font size", () => {
      const store = createStore();

      store.dispatch(setReadingFontSize(22));

      const state = store.getState().settings;
      expect(state.readingFontSize).toBe(22);
    });

    it("font size persists across app restarts", async () => {
      const savedSettings = { readingFontSize: 20, enableNotifications: true };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(savedSettings)
      );

      const store = createStore();
      await store.dispatch(retrieveSettings());

      const state = store.getState().settings;
      expect(state.readingFontSize).toBe(20);
    });
  });

  describe("notification preferences", () => {
    it("user can enable notifications", () => {
      const store = createStore();

      store.dispatch(setEnableNotifications(true));

      const state = store.getState().settings;
      expect(state.enableNotifications).toBe(true);
    });

    it("notification preference persists", async () => {
      const store = createStore();
      store.dispatch(setEnableNotifications(true));

      await store.dispatch(storeSettings());

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedValue = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedValue.enableNotifications).toBe(true);
    });
  });

  describe("settings restoration", () => {
    it("restores all settings on app launch", async () => {
      const savedSettings = {
        readingFontSize: 18,
        enableNotifications: false,
        readingBackgroundColor: "#F5F5DC",
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(savedSettings)
      );

      const store = createStore();
      await store.dispatch(retrieveSettings());

      const state = store.getState().settings;
      expect(state.readingFontSize).toBe(18);
      expect(state.enableNotifications).toBe(false);
      expect(state.readingBackgroundColor).toBe("#F5F5DC");
    });

    it("uses defaults when no saved settings exist", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const store = createStore();
      await store.dispatch(retrieveSettings());

      const state = store.getState().settings;
      // Should have sensible defaults
      expect(state.readingFontSize).toBeDefined();
      expect(typeof state.readingFontSize).toBe("number");
    });
  });
});
```

#### Tasks - Phase 2

- [ ] Create `src/redux/__tests__/readingPlanSlice.test.ts`
- [ ] Create `src/redux/__tests__/esvSlice.test.ts`
- [ ] Create `src/redux/__tests__/memorySlice.test.ts`
- [ ] Create `src/redux/__tests__/settingsSlice.test.ts`
- [ ] Add Firebase mock to `jest/setup.js`
- [ ] Run full test suite and verify all pass

---

### Phase 3: Smoke Tests for Key Screens

**Goal**: Verify screens render without crashing with real data.

#### 3.1 TodayScreen Smoke Test

**File**: `src/screens/TodayScreen/__tests__/TodayScreen.test.tsx`

```typescript
import React from "react";
import { render, waitFor } from "jest/testUtils";
import { NavigationContainer } from "@react-navigation/native";
import { TodayScreen } from "../TodayScreen";

describe("TodayScreen", () => {
  it("renders without crashing when loading", () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TodayScreen />
      </NavigationContainer>,
      {
        preloadedState: {
          readingPlan: { loading: true, readingPlan: null },
        },
      }
    );

    // Should show loading state, not crash
    expect(getByTestId("loading-indicator")).toBeTruthy();
  });

  it("renders readings when data is loaded", async () => {
    const mockPlan = {
      id: "nt-2026",
      weeks: [
        {
          weekNumber: 1,
          days: [{ day: 1, passages: ["Matthew 1"] }],
        },
      ],
    };

    const { getByText } = render(
      <NavigationContainer>
        <TodayScreen />
      </NavigationContainer>,
      {
        preloadedState: {
          readingPlan: {
            loading: false,
            readingPlan: mockPlan,
            readingPlanProgressState: { completedPassages: [] },
          },
        },
      }
    );

    await waitFor(() => {
      expect(getByText(/Matthew/i)).toBeTruthy();
    });
  });

  it("handles empty reading plan gracefully", () => {
    const { queryByText } = render(
      <NavigationContainer>
        <TodayScreen />
      </NavigationContainer>,
      {
        preloadedState: {
          readingPlan: { loading: false, readingPlan: null },
        },
      }
    );

    // Should not crash, might show "select a plan" message
    expect(queryByText(/crash/i)).toBeNull();
  });
});
```

#### 3.2 ReadScreen Smoke Test

**File**: `src/screens/ReadScreen/__tests__/ReadScreen.test.tsx`

```typescript
import React from "react";
import { render, waitFor } from "jest/testUtils";
import { NavigationContainer } from "@react-navigation/native";
import { ReadScreen } from "../ReadScreen";

// Mock route params
const mockRoute = {
  params: {
    passages: [
      {
        book: "John",
        startChapter: "3",
        endChapter: "3",
        startVerse: "16",
        endVerse: "17",
        isMemory: false,
      },
    ],
    onComplete: jest.fn(),
  },
};

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useRoute: () => mockRoute,
}));

describe("ReadScreen", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <NavigationContainer>
        <ReadScreen />
      </NavigationContainer>,
      {
        preloadedState: {
          esv: { loading: true, currentPassage: null },
          settings: { readingFontSize: 16 },
        },
      }
    );

    expect(container).toBeTruthy();
  });

  it("displays passage text when loaded", async () => {
    const { getByText } = render(
      <NavigationContainer>
        <ReadScreen />
      </NavigationContainer>,
      {
        preloadedState: {
          esv: {
            loading: false,
            currentPassage: "<p>For God so loved the world...</p>",
          },
          settings: { readingFontSize: 16 },
        },
      }
    );

    await waitFor(() => {
      expect(getByText(/God so loved/i)).toBeTruthy();
    });
  });
});
```

#### Tasks - Phase 3

- [ ] Create `src/screens/TodayScreen/__tests__/TodayScreen.test.tsx`
- [ ] Create `src/screens/ReadScreen/__tests__/ReadScreen.test.tsx`
- [ ] Run full test suite

---

## Acceptance Criteria

### What Must Work

- [ ] `npm test` runs without errors
- [ ] All passage parsing edge cases pass
- [ ] Reading plans load from Firebase mock
- [ ] Progress saves to AsyncStorage mock
- [ ] Bible text fetches from ESV API mock
- [ ] Memory verses persist correctly
- [ ] Settings save and restore

### What We're NOT Measuring

- ❌ Coverage percentage (not a goal)
- ❌ Number of test files
- ❌ Redux action coverage

---

## Success Metrics

| Metric                | Measurement                                       |
| --------------------- | ------------------------------------------------- |
| Tests pass            | `npm test` exits with code 0                      |
| Critical logic tested | `parsePassageString` has comprehensive tests      |
| User flows covered    | Reading plan, ESV, memory, settings slices tested |
| Screens don't crash   | Smoke tests pass for TodayScreen, ReadScreen      |

---

## File Summary

After implementation, you'll have:

```
jest/
├── setup.js           # Updated with minimal mocks
└── testUtils.tsx      # Fixed with preloadedState support

src/
├── app/__tests__/
│   └── utils.test.ts           # ~100 lines - passage parsing
└── redux/__tests__/
    ├── readingPlanSlice.test.ts  # ~80 lines - plan loading
    ├── esvSlice.test.ts          # ~60 lines - Bible text
    ├── memorySlice.test.ts       # ~70 lines - memory verses
    └── settingsSlice.test.ts     # ~60 lines - settings

src/screens/
├── TodayScreen/__tests__/
│   └── TodayScreen.test.tsx    # ~40 lines - smoke test
└── ReadScreen/__tests__/
    └── ReadScreen.test.tsx     # ~40 lines - smoke test
```

**Total: ~450 lines of focused, useful tests**

---

## References

### Internal

- Existing test: `src/components/FlatButton/__tests__/FlatButton.test.tsx`
- Existing test: `src/screens/RootScreen/__tests__/RootScreen.test.tsx`
- Core logic: `src/app/utils.ts`

### External

- [Expo Testing Docs](https://docs.expo.dev/develop/unit-testing/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Redux Testing](https://redux.js.org/usage/writing-tests)
