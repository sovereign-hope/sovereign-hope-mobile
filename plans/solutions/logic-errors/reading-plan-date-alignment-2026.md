# Reading Plan Date Alignment Bugs (2026)

---

title: Reading Plan Date Alignment and Display Bugs
date: 2026-01-01
category: logic-errors
tags:

- date-calculations
- iso-week
- day-of-year
- sectionlist
- react-native
- redux-selectors
- firestore
  severity: medium
  component: ReadingPlanScreen, readingPlanSlice, utils
  symptoms:
- Week headers showing wrong dates (12/29 instead of 1/1)
- Extra gray space above SectionList when scrolling up
- Day numbers counting globally instead of resetting per week
- Memory verses not loading on TodayScreen
- Redux selector re-render warnings

---

## Summary

Three interconnected bugs in the reading plan functionality manifested on January 1, 2026:

1. **Date display off-by-one**: Week headers showed "12/29" instead of "1/1"
2. **Extra UI space**: Gray gap above section list when scrolling to top
3. **Day numbering**: Days counted 1-365 instead of resetting 1-7 per week

Additional related fixes:

- Firestore sparse array serialization
- Redux selector memoization warnings
- Memory verse display using empty placeholder days

---

## Bug 1: Date Display Off-by-One

### Symptom

Week 1 header displayed "12/29" instead of "1/1" for January 1, 2026.

### Root Cause

The original `weekDateToDate()` function used ISO week calculations where week 1 can start in late December of the previous year. However, the reading plan data structure uses day-of-year alignment where week 0, day 0 corresponds to January 1st.

January 1, 2026 is a **Thursday** (`getDay() = 4`, offset = 3 for Monday-based week).

### Solution

Created new utility functions with day-of-week alignment:

```typescript
// src/app/utils.ts

/**
 * Convert week/day indices to display date string.
 * Uses day-of-week alignment where Monday = 0, Sunday = 6.
 * Week 0 starts on the Monday of the week containing January 1st.
 */
export const dayOfYearToDate = (
  year: number,
  weekIndex: number,
  dayIndex: number
): string => {
  const jan1 = new Date(year, 0, 1);
  const jan1DayOfWeek = jan1.getDay();
  // Convert Sunday=0 to Monday=0 system: Mon=0, Tue=1, ..., Sun=6
  const startOffset = jan1DayOfWeek === 0 ? 6 : jan1DayOfWeek - 1;

  // Calculate absolute day index from week 0 day 0
  const absoluteDayIndex = weekIndex * 7 + dayIndex;
  // Subtract offset to get days since Jan 1
  const daysSinceJan1 = absoluteDayIndex - startOffset;

  const date = new Date(year, 0, 1 + daysSinceJan1);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

/**
 * Get current week and day indices based on day-of-year alignment.
 */
export const getDayOfYearIndices = (
  d: Date
): { year: number; weekIndex: number; dayIndex: number } => {
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const jan1DayOfWeek = jan1.getDay();
  const startOffset = jan1DayOfWeek === 0 ? 6 : jan1DayOfWeek - 1;

  const startOfYear = new Date(year, 0, 1);
  const daysSinceJan1 = Math.floor(
    (d.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
  );

  const absoluteDayIndex = daysSinceJan1 + startOffset;

  return {
    year,
    weekIndex: Math.floor(absoluteDayIndex / 7),
    dayIndex: absoluteDayIndex % 7,
  };
};
```

### Files Modified

- `src/app/utils.ts` - Added new date functions
- `src/app/__tests__/utils.test.ts` - Added comprehensive tests
- `src/redux/readingPlanSlice.ts` - Updated selectors to use new functions
- `src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx` - Use `dayOfYearToDate()` for headers

---

## Bug 2: Extra Space Above SectionList

### Symptom

Large gray gap visible when scrolling to the top of the Reading Plan screen.

### Root Cause

The navigation header is **opaque** (not transparent), but the SectionList had `paddingTop: headerHeight` which is only needed for transparent headers. This created duplicate spacing.

### Solution

Remove the unnecessary padding since the opaque header already occupies space:

```typescript
// BEFORE (incorrect)
<SectionList
  contentContainerStyle={{
    paddingTop: headerHeight,  // Creates duplicate space
    paddingBottom: miniPlayerHeight,
  }}
  scrollIndicatorInsets={{ top: headerHeight }}
  // ...
/>

// AFTER (correct)
<SectionList
  bounces={false}  // Prevents overscroll revealing any residual space
  contentContainerStyle={{
    paddingBottom: miniPlayerHeight,
  }}
  // ...
/>
```

### Key Insight

Only use `paddingTop: headerHeight` when `headerTransparent: true` is set in navigation options. Check the screen's navigation configuration before adding header padding.

### Files Modified

- `src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx` - Removed paddingTop and headerHeight

---

## Bug 3: Day Numbering Not Resetting Per Week

### Symptom

Days displayed as "Day 1, Day 2, ... Day 365" instead of "Day 1-7" resetting each week.

### Root Cause

A `runningDayNumber` counter was incremented globally across all weeks instead of resetting per week.

### Solution

Assign `displayDayNumber` based on position within filtered array, which naturally resets for each week:

```typescript
const nonEmptyDays = week.days
  .map((day, dayIndex) => {
    const hasContent = day.reading.length > 0 && day.reading[0] !== "";
    if (!hasContent) return; // Filter empty placeholder days

    return {
      ...day,
      weekIndex,
      originalDayIndex: dayIndex, // Keep for progress tracking
    };
  })
  .filter(Boolean)
  // Add displayDayNumber AFTER filtering (resets each week)
  .map((day, filteredIndex) => ({
    ...day,
    displayDayNumber: filteredIndex + 1, // 1-indexed, resets per week
  }));
```

### Key Insight

- Use `originalDayIndex` for data operations (Firestore progress tracking)
- Use `displayDayNumber` for UI display
- Compute display values from array position after filtering, not from global counters

### Files Modified

- `src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx` - Restructured day mapping

---

## Related Fix: Firestore Sparse Arrays

### Problem

`Array(7)` creates sparse arrays that Firestore compresses, losing empty slots.

### Solution

Initialize arrays with proper structure:

```javascript
// sendPlanToFirestore.gs

const createEmptyDay = () => ({
  reading: [],
  memory: { passage: "", heading: "" },
});

let weeks = [
  {
    days: Array.from({ length: NUMBER_OF_DAYS }, createEmptyDay),
  },
];
```

---

## Related Fix: Redux Selector Memoization

### Problem

Warning: "Selector selectWeekReadingPlan returned a different result when called with the same parameters"

### Solution

Wrap selectors that compute derived data with `createSelector`:

```typescript
import { createSelector } from "@reduxjs/toolkit";

export const selectWeekReadingPlan = createSelector(
  [
    (state: RootState) => state.readingPlan.readingPlan,
    (state: RootState) => state.readingPlan.readingPlanProgressState,
  ],
  (readingPlan, progressState): ReadingPlanWeek | undefined => {
    const { weekIndex } = getDayOfYearIndices(new Date());
    const currentWeek = readingPlan?.weeks[weekIndex] ?? { days: [] };

    return {
      days: currentWeek.days.map((day, index) => ({
        ...day,
        isComplete:
          progressState?.weeks[weekIndex]?.days[index]?.isCompleted ?? false,
      })),
    };
  }
);
```

---

## Related Fix: Memory Verse Display

### Problem

Memory verse on TodayScreen not loading because `days[0]?.memory.passage` accessed an empty placeholder day.

### Solution

Find the first day with actual content:

```typescript
const weeklyMemoryDay = useMemo(
  () =>
    readingPlanWeek?.days.find(
      (day) => day?.memory?.passage && day.memory.passage.length > 0
    ),
  [readingPlanWeek]
);

// Use weeklyMemoryDay.memory.passage instead of days[0].memory.passage
```

---

## Prevention Strategies

### Date Calculations

- Always test date functions with year boundaries (Dec 31, Jan 1)
- Document the expected index system (ISO week vs day-of-year)
- Test leap years (Feb 29)
- Verify behavior for different starting days of the year

### SectionList Padding

- Check navigation header configuration before adding padding
- Only use `paddingTop: headerHeight` with `headerTransparent: true`
- Use `bounces={false}` to prevent overscroll revealing padding

### Counter Variables

- Prefer deriving values from array index after filtering
- Use `filteredIndex + 1` instead of global counters
- Keep separate indices for data operations vs display

### Array Initialization

- Use `Array.from({ length: n }, initFn)` instead of `Array(n)`
- Always initialize with proper structure for Firestore

### Redux Selectors

- Use `createSelector` for any selector computing derived data
- Simple field accessors don't need memoization

---

## Test Cases Added

```typescript
// src/app/__tests__/utils.test.ts

describe("dayOfYearToDate", () => {
  it("returns 1/1 for week 0, day 3 (Thursday = Jan 1, 2026)", () => {
    expect(dayOfYearToDate(2026, 0, 3)).toBe("1/1");
  });

  it("returns 1/5 for week 1, day 0 (Monday = Jan 5, 2026)", () => {
    expect(dayOfYearToDate(2026, 1, 0)).toBe("1/5");
  });

  it("handles leap years correctly (Feb 29, 2024)", () => {
    expect(dayOfYearToDate(2024, 8, 3)).toBe("2/29");
  });
});

describe("getDayOfYearIndices", () => {
  it("returns week 0, day 3 for January 1, 2026 (Thursday)", () => {
    const result = getDayOfYearIndices(new Date(2026, 0, 1));
    expect(result.weekIndex).toBe(0);
    expect(result.dayIndex).toBe(3);
  });
});
```

---

## Files Modified

| File                                                  | Changes                                               |
| ----------------------------------------------------- | ----------------------------------------------------- |
| `src/app/utils.ts`                                    | Added `dayOfYearToDate`, `getDayOfYearIndices`        |
| `src/app/__tests__/utils.test.ts`                     | Added date function tests                             |
| `src/redux/readingPlanSlice.ts`                       | Memoized selectors, updated to use new date functions |
| `src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx` | Removed padding, fixed day numbering                  |
| `src/screens/TodayScreen/TodayScreen.tsx`             | Added weeklyMemoryDay memoization                     |
| `sendPlanToFirestore.gs`                              | Initialize arrays with createEmptyDay                 |

---

## Cross-References

- [Comprehensive Testing Suite Plan](../comprehensive-testing-suite.md) - Related test infrastructure
- `src/app/utils.ts` - Date utility functions
- `src/redux/readingPlanSlice.ts` - Reading plan state management
